import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { query, setupDatabase } from "./database.js";

dotenv.config();

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

for (const key of [
  "DATABASE_URL",
  "JWT_SECRET",
  "DEVELOPER_PASSWORD_HASH"
]) {
  if (!process.env[key]) {
    throw new Error(`${key} не встановлено`);
  }
}

app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

app.use(
  express.json({
    limit: "2mb"
  })
);

app.use(cookieParser());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false
});

app.use("/api", limiter);

const developerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false
});

function uuid() {
  return crypto.randomUUID();
}

function signUser(id) {
  return jwt.sign(
    { type: "user", id },
    process.env.JWT_SECRET,
    { expiresIn: "30d" }
  );
}

function signDeveloper() {
  return jwt.sign(
    { type: "developer" },
    process.env.JWT_SECRET,
    { expiresIn: "2h" }
  );
}

function userAuth(req, res, next) {
  try {
    const token = req.cookies.clidex_user;

    if (!token) {
      return res.status(401).json({
        error: "Потрібно увійти"
      });
    }

    req.user = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (req.user.type !== "user") {
      throw new Error();
    }

    next();
  } catch {
    res.status(401).json({
      error: "Сесія недійсна"
    });
  }
}

function developerAuth(req, res, next) {
  try {
    const token =
      req.cookies.clidex_developer;

    if (!token) {
      return res.status(403).json({
        error: "Доступ заборонено"
      });
    }

    const data = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (data.type !== "developer") {
      throw new Error();
    }

    next();
  } catch {
    res.status(403).json({
      error: "Доступ заборонено"
    });
  }
}

function validImage(value) {
  if (!value) return null;

  if (
    typeof value !== "string" ||
    !value.startsWith("data:image/")
  ) {
    return null;
  }

  if (value.length > 1000000) {
    return null;
  }

  return value;
}

/* ---------- STATIC ---------- */

app.use(
  express.static(__dirname, {
    index: false
  })
);

app.get("/", (req, res) => {
  res.sendFile(
    path.join(__dirname, "index.html")
  );
});

/* ---------- REGISTER ---------- */

app.post(
  "/api/register",
  developerLimiter,
  async (req, res) => {
    try {
      const nickname =
        String(req.body.nickname || "")
          .trim();

      const password =
        String(req.body.password || "");

      const avatar =
        validImage(req.body.avatar);

      if (
        nickname.length < 3 ||
        nickname.length > 30 ||
        password.length < 6 ||
        password.length > 100
      ) {
        return res.status(400).json({
          error: "Неправильні дані"
        });
      }

      const exists = await query(
        `
        SELECT id
        FROM users
        WHERE LOWER(nickname)=LOWER($1)
        `,
        [nickname]
      );

      if (exists.rows.length) {
        return res.status(409).json({
          error: "Такий нік вже зайнятий"
        });
      }

      const passwordHash =
        await bcrypt.hash(password, 12);

      const userId = uuid();

      await query(
        `
        INSERT INTO users
        (id,nickname,avatar,password_hash)
        VALUES ($1,$2,$3,$4)
        `,
        [
          userId,
          nickname,
          avatar,
          passwordHash
        ]
      );

      const token = signUser(userId);

      res.cookie(
        "clidex_user",
        token,
        {
          httpOnly: true,
          secure:
            process.env.NODE_ENV ===
            "production",
          sameSite: "lax",
          maxAge:
            30 * 24 * 60 * 60 * 1000
        }
      );

      res.json({
        success: true
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error: "Помилка сервера"
      });
    }
  }
);

/* ---------- LOGIN ---------- */

app.post(
  "/api/login",
  developerLimiter,
  async (req, res) => {
    try {
      const nickname =
        String(req.body.nickname || "")
          .trim();

      const password =
        String(req.body.password || "");

      const result = await query(
        `
        SELECT *
        FROM users
        WHERE LOWER(nickname)=LOWER($1)
        `,
        [nickname]
      );

      const user = result.rows[0];

      if (!user) {
        return res.status(401).json({
          error: "Неправильний нік або пароль"
        });
      }

      const valid =
        await bcrypt.compare(
          password,
          user.password_hash
        );

      if (!valid) {
        return res.status(401).json({
          error: "Неправильний нік або пароль"
        });
      }

      res.cookie(
        "clidex_user",
        signUser(user.id),
        {
          httpOnly: true,
          secure:
            process.env.NODE_ENV ===
            "production",
          sameSite: "lax",
          maxAge:
            30 * 24 * 60 * 60 * 1000
        }
      );

      res.json({
        success: true,
        user: {
          id: user.id,
          nickname: user.nickname,
          avatar: user.avatar
        }
      });
    } catch {
      res.status(500).json({
        error: "Помилка сервера"
      });
    }
  }
);

/* ---------- ME ---------- */

app.get(
  "/api/me",
  userAuth,
  async (req, res) => {
    const result = await query(
      `
      SELECT id,nickname,avatar
      FROM users
      WHERE id=$1
      `,
      [req.user.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        error: "Користувача не знайдено"
      });
    }

    res.json({
      user: result.rows[0]
    });
  }
);

/* ---------- LOGOUT ---------- */

app.post("/api/logout", (req, res) => {
  res.clearCookie("clidex_user");
  res.clearCookie("clidex_developer");

  res.json({
    success: true
  });
});

/* ---------- DEVELOPER LOGIN ---------- */

app.post(
  "/api/developer/login",
  developerLimiter,
  async (req, res) => {
    const password =
      String(req.body.password || "");

    const valid =
      await bcrypt.compare(
        password,
        process.env.DEVELOPER_PASSWORD_HASH
      );

    if (!valid) {
      return res.status(401).json({
        error: "Неправильний пароль"
      });
    }

    res.cookie(
      "clidex_developer",
      signDeveloper(),
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          "production",
        sameSite: "strict",
        maxAge:
          2 * 60 * 60 * 1000
      }
    );

    res.json({
      success: true
    });
  }
);

/* ---------- DEVELOPER STATUS ---------- */

app.get(
  "/api/developer/status",
  developerAuth,
  (req, res) => {
    res.json({
      developer: true
    });
  }
);

/* ---------- DEVELOPER LOGOUT ---------- */

app.post(
  "/api/developer/logout",
  (req, res) => {
    res.clearCookie(
      "clidex_developer"
    );

    res.json({
      success: true
    });
  }
);

/* ---------- NEWS ---------- */

app.get("/api/news", async (req, res) => {
  const result = await query(`
    SELECT
      n.*,
      COUNT(r.id)::integer AS reaction_count
    FROM news n
    LEFT JOIN reactions r
      ON r.news_id=n.id
    GROUP BY n.id
    ORDER BY n.created_at DESC
  `);

  res.json({
    news: result.rows
  });
});

/* ---------- CREATE NEWS ---------- */

app.post(
  "/api/news",
  developerAuth,
  async (req, res) => {
    const title =
      String(req.body.title || "")
        .trim();

    const content =
      String(req.body.content || "")
        .trim();

    const gameUrl =
      req.body.gameUrl
        ? String(req.body.gameUrl).trim()
        : null;

    const image =
      validImage(req.body.image);

    if (
      title.length < 3 ||
      title.length > 150 ||
      content.length < 3 ||
      content.length > 5000
    ) {
      return res.status(400).json({
        error: "Неправильні дані"
      });
    }

    if (gameUrl) {
      try {
        const url = new URL(gameUrl);

        if (
          url.protocol !== "https:" &&
          url.protocol !== "http:"
        ) {
          throw new Error();
        }
      } catch {
        return res.status(400).json({
          error: "Неправильне посилання"
        });
      }
    }

    await query(
      `
      INSERT INTO news
      (id,title,content,image,game_url)
      VALUES ($1,$2,$3,$4,$5)
      `,
      [
        uuid(),
        title,
        content,
        image,
        gameUrl
      ]
    );

    res.json({
      success: true
    });
  }
);

/* ---------- DELETE NEWS ---------- */

app.delete(
  "/api/news/:id",
  developerAuth,
  async (req, res) => {
    await query(
      `
      DELETE FROM news
      WHERE id=$1
      `,
      [req.params.id]
    );

    res.json({
      success: true
    });
  }
);

/* ---------- REACTION ---------- */

app.post(
  "/api/news/:id/reaction",
  userAuth,
  async (req, res) => {
    const allowed = [
      "❤️",
      "🔥",
      "👍",
      "🎉"
    ];

    const reaction =
      req.body.reaction;

    if (!allowed.includes(reaction)) {
      return res.status(400).json({
        error: "Недозволена реакція"
      });
    }

    await query(
      `
      INSERT INTO reactions
      (id,news_id,user_id,reaction)
      VALUES ($1,$2,$3,$4)
      ON CONFLICT(news_id,user_id)
      DO UPDATE SET reaction=EXCLUDED.reaction
      `,
      [
        uuid(),
        req.params.id,
        req.user.id,
        reaction
      ]
    );

    res.json({
      success: true
    });
  }
);

/* ---------- APPLICATION ---------- */

app.post(
  "/api/applications",
  userAuth,
  async (req, res) => {
    const telegram =
      String(
        req.body.telegramUsername || ""
      ).trim();

    const role =
      String(
        req.body.wantedRole || ""
      );

    const roles = [
      "developer",
      "concept",
      "artist"
    ];

    if (
      telegram.length < 2 ||
      telegram.length > 100 ||
      !roles.includes(role)
    ) {
      return res.status(400).json({
        error: "Неправильні дані"
      });
    }

    const existing = await query(
      `
      SELECT id
      FROM applications
      WHERE user_id=$1
      AND status='pending'
      `,
      [req.user.id]
    );

    if (existing.rows.length) {
      return res.status(409).json({
        error:
          "У вас вже є заявка на розгляді"
      });
    }

    await query(
      `
      INSERT INTO applications
      (id,user_id,telegram_username,wanted_role)
      VALUES ($1,$2,$3,$4)
      `,
      [
        uuid(),
        req.user.id,
        telegram,
        role
      ]
    );

    res.json({
      success: true
    });
  }
);

/* ---------- APPLICATIONS ---------- */

app.get(
  "/api/developer/applications",
  developerAuth,
  async (req, res) => {
    const result = await query(`
      SELECT
        a.*,
        u.nickname,
        u.avatar
      FROM applications a
      JOIN users u
        ON u.id=a.user_id
      ORDER BY a.created_at DESC
    `);

    res.json({
      applications: result.rows
    });
  }
);

/* ---------- ACCEPT ---------- */

app.post(
  "/api/developer/applications/:id/accept",
  developerAuth,
  async (req, res) => {
    const result = await query(
      `
      UPDATE applications
      SET
        status='accepted',
        updated_at=CURRENT_TIMESTAMP
      WHERE id=$1
      RETURNING *
      `,
      [req.params.id]
    );

    const application =
      result.rows[0];

    if (!application) {
      return res.status(404).json({
        error: "Заявку не знайдено"
      });
    }

    await query(
      `
      INSERT INTO messages
      (id,receiver_id,title,content)
      VALUES ($1,$2,$3,$4)
      `,
      [
        uuid(),
        application.user_id,
        "Заявку прийнято 🎉",
        "Вітаємо! Вашу заявку до Clidex Studio прийнято. Очікуйте подальших повідомлень."
      ]
    );

    res.json({
      success: true
    });
  }
);

/* ---------- REJECT ---------- */

app.post(
  "/api/developer/applications/:id/reject",
  developerAuth,
  async (req, res) => {
    const message =
      String(req.body.message || "")
        .trim();

    if (
      message.length < 2 ||
      message.length > 2000
    ) {
      return res.status(400).json({
        error: "Вкажіть причину"
      });
    }

    const result = await query(
      `
      UPDATE applications
      SET
        status='rejected',
        owner_message=$1,
        updated_at=CURRENT_TIMESTAMP
      WHERE id=$2
      RETURNING *
      `,
      [
        message,
        req.params.id
      ]
    );

    const application =
      result.rows[0];

    if (!application) {
      return res.status(404).json({
        error: "Заявку не знайдено"
      });
    }

    await query(
      `
      INSERT INTO messages
      (id,receiver_id,title,content)
      VALUES ($1,$2,$3,$4)
      `,
      [
        uuid(),
        application.user_id,
        "Заявку відхилено",
        message
      ]
    );

    res.json({
      success: true
    });
  }
);

/* ---------- MESSAGES ---------- */

app.get(
  "/api/messages",
  userAuth,
  async (req, res) => {
    const result = await query(
      `
      SELECT *
      FROM messages
      WHERE receiver_id=$1
      ORDER BY created_at DESC
      `,
      [req.user.id]
    );

    res.json({
      messages: result.rows
    });
  }
);

/* ---------- READ MESSAGE ---------- */

app.post(
  "/api/messages/:id/read",
  userAuth,
  async (req, res) => {
    await query(
      `
      UPDATE messages
      SET is_read=true
      WHERE id=$1
      AND receiver_id=$2
      `,
      [
        req.params.id,
        req.user.id
      ]
    );

    res.json({
      success: true
    });
  }
);

/* ---------- ERROR ---------- */

app.use(
  (err, req, res, next) => {
    console.error(err);

    res.status(500).json({
      error: "Внутрішня помилка сервера"
    });
  }
);

/* ---------- START ---------- */

setupDatabase()
  .then(() => {
    app.listen(
      PORT,
      "0.0.0.0",
      () => {
        console.log(
          `Clidex Studio запущено на ${PORT}`
        );
      }
    );
  })
  .catch(error => {
    console.error(
      "ПОМИЛКА БАЗИ:",
      error
    );

    process.exit(1);
  });
