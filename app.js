"use strict";

/*
=========================================================
CLIDEX STUDIO
Frontend application
=========================================================
*/

const API = "/api";

let currentUser = null;
let developerAuthenticated = false;
let selectedAvatarData = null;
let toastTimer = null;


/* =====================================================
   DOM HELPERS
===================================================== */

const $ = (selector) => document.querySelector(selector);

const $$ = (selector) => {
  return [...document.querySelectorAll(selector)];
};


/* =====================================================
   API
===================================================== */

async function apiRequest(
  endpoint,
  options = {}
) {
  const config = {
    credentials: "include",
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : {
            "Content-Type": "application/json"
          }),
      ...(options.headers || {})
    }
  };

  try {
    const response = await fetch(
      `${API}${endpoint}`,
      config
    );

    let data = {};

    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(
        data.message ||
        data.error ||
        "Сталася помилка сервера."
      );
    }

    return data;

  } catch (error) {

    if (
      error.name === "TypeError" ||
      error.message === "Failed to fetch"
    ) {
      throw new Error(
        "Не вдалося підключитися до сервера."
      );
    }

    throw error;
  }
}


/* =====================================================
   TOAST
===================================================== */

function showToast(
  message,
  type = "success"
) {
  const toast = $("#toast");
  const text = $("#toastText");
  const icon = $("#toastIcon");

  if (!toast || !text || !icon) {
    return;
  }

  clearTimeout(toastTimer);

  text.textContent = message;

  if (type === "error") {
    icon.textContent = "!";
  } else {
    icon.textContent = "✓";
  }

  toast.classList.remove("hidden");

  toastTimer = setTimeout(() => {
    toast.classList.add("hidden");
  }, 3500);
}


/* =====================================================
   FORM RESULT
===================================================== */

function showResult(
  element,
  message,
  type = "success"
) {
  if (!element) return;

  element.textContent = message;

  element.classList.remove(
    "hidden",
    "success",
    "error"
  );

  element.classList.add(type);
}


/* =====================================================
   LOADER
===================================================== */

function startLoader() {

  const loader = $("#loader");
  const progress = $("#loaderProgress");

  if (!loader || !progress) {
    return;
  }

  let value = 0;

  const timer = setInterval(() => {

    value += Math.floor(
      Math.random() * 12
    ) + 4;

    if (value >= 100) {
      value = 100;

      clearInterval(timer);

      progress.style.width = "100%";

      setTimeout(() => {

        loader.classList.add("hide");

        setTimeout(() => {
          loader.remove();
        }, 700);

      }, 250);

      return;
    }

    progress.style.width =
      `${value}%`;

  }, 100);
}


/* =====================================================
   NAVIGATION
===================================================== */

function openSection(sectionName) {

  const sections = $$(".section");

  sections.forEach(section => {
    section.classList.remove("active");
  });

  const target =
    $(`#section-${sectionName}`);

  if (target) {
    target.classList.add("active");
  }

  $$(".nav-button").forEach(button => {

    button.classList.toggle(
      "active",
      button.dataset.section === sectionName
    );

  });

  const sidebar = $("#sidebar");

  if (sidebar) {
    sidebar.classList.remove("open");
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });


  /*
    Завантажуємо актуальні дані
    при відкритті розділів.
  */

  if (sectionName === "news") {
    loadNews();
  }

  if (sectionName === "messages") {
    loadMessages();
  }

  if (sectionName === "games") {
    loadGames();
  }

  if (
    sectionName === "applications" &&
    currentUser
  ) {
    checkApplicationStatus();
  }

  if (
    sectionName === "developer" &&
    developerAuthenticated
  ) {
    loadApplications();
  }
}


/* =====================================================
   NAV BUTTONS
===================================================== */

function setupNavigation() {

  $$(".nav-button").forEach(button => {

    button.addEventListener(
      "click",
      () => {

        openSection(
          button.dataset.section
        );

      }
    );

  });


  $$("[data-section-target]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          openSection(
            button.dataset.sectionTarget
          );

        }
      );

    });


  const mobileMenu =
    $("#mobileMenuButton");

  const sidebar =
    $("#sidebar");

  if (mobileMenu && sidebar) {

    mobileMenu.addEventListener(
      "click",
      () => {
        sidebar.classList.toggle("open");
      }
    );

  }

}


/* =====================================================
   AUTH MODAL
===================================================== */

function openAuthModal() {

  const modal = $("#authModal");

  if (!modal) return;

  modal.classList.remove("hidden");

}


function closeAuthModal() {

  const modal = $("#authModal");

  if (!modal) return;

  modal.classList.add("hidden");

}


function setupAuthTabs() {

  const registerTab =
    $("#registerTab");

  const loginTab =
    $("#loginTab");

  const registerForm =
    $("#registerForm");

  const loginForm =
    $("#loginForm");


  if (
    !registerTab ||
    !loginTab ||
    !registerForm ||
    !loginForm
  ) {
    return;
  }


  registerTab.addEventListener(
    "click",
    () => {

      registerTab.classList.add(
        "active"
      );

      loginTab.classList.remove(
        "active"
      );

      registerForm.classList.remove(
        "hidden"
      );

      loginForm.classList.add(
        "hidden"
      );

    }
  );


  loginTab.addEventListener(
    "click",
    () => {

      loginTab.classList.add(
        "active"
      );

      registerTab.classList.remove(
        "active"
      );

      loginForm.classList.remove(
        "hidden"
      );

      registerForm.classList.add(
        "hidden"
      );

    }
  );

}


/* =====================================================
   AVATAR
===================================================== */

function setupAvatarPreview() {

  const input =
    $("#registerAvatar");

  const preview =
    $("#avatarPreview");

  if (!input || !preview) {
    return;
  }


  input.addEventListener(
    "change",
    () => {

      const file =
        input.files?.[0];

      if (!file) {

        selectedAvatarData = null;

        preview.classList.add(
          "hidden"
        );

        preview.innerHTML = "";

        return;
      }


      /*
        Обмеження на клієнті.
        Сервер також ОБОВ'ЯЗКОВО
        повинен перевіряти файл.
      */

      const allowedTypes = [
        "image/png",
        "image/jpeg",
        "image/webp"
      ];

      if (
        !allowedTypes.includes(
          file.type
        )
      ) {

        showToast(
          "Дозволені PNG, JPG та WEBP.",
          "error"
        );

        input.value = "";

        return;
      }


      if (
        file.size >
        2 * 1024 * 1024
      ) {

        showToast(
          "Аватарка має бути до 2 МБ.",
          "error"
        );

        input.value = "";

        return;
      }


      const reader =
        new FileReader();


      reader.onload = () => {

        selectedAvatarData =
          reader.result;

        preview.innerHTML =
          `<img src="${escapeHtml(
            selectedAvatarData
          )}" alt="Аватар">`;

        preview.classList.remove(
          "hidden"
        );

      };


      reader.readAsDataURL(file);

    }
  );

}


/* =====================================================
   REGISTER
===================================================== */

async function registerUser(event) {

  event.preventDefault();


  const nickname =
    $("#registerNickname")
      ?.value
      .trim();

  const password =
    $("#registerPassword")
      ?.value || "";


  const result =
    $("#authResult");


  if (!nickname || !password) {

    showResult(
      result,
      "Заповни всі обов'язкові поля.",
      "error"
    );

    return;
  }


  if (nickname.length < 3) {

    showResult(
      result,
      "Нік має містити щонайменше 3 символи.",
      "error"
    );

    return;
  }


  if (password.length < 6) {

    showResult(
      result,
      "Пароль має містити щонайменше 6 символів.",
      "error"
    );

    return;
  }


  const button =
    event.submitter;

  if (button) {
    button.disabled = true;
  }


  try {

    const data =
      await apiRequest(
        "/auth/register",
        {
          method: "POST",

          body: JSON.stringify({
            nickname,
            password,
            avatar:
              selectedAvatarData
          })
        }
      );


    currentUser =
      data.user || null;


    closeAuthModal();

    updateUserUI();

    showToast(
      "Профіль успішно створено!"
    );


    await refreshAll();


  } catch (error) {

    showResult(
      result,
      error.message,
      "error"
    );

  } finally {

    if (button) {
      button.disabled = false;
    }

  }

}


/* =====================================================
   LOGIN
===================================================== */

async function loginUser(event) {

  event.preventDefault();


  const nickname =
    $("#loginNickname")
      ?.value
      .trim();

  const password =
    $("#loginPassword")
      ?.value || "";


  const result =
    $("#authResult");


  if (!nickname || !password) {

    showResult(
      result,
      "Введи нік та пароль.",
      "error"
    );

    return;
  }


  const button =
    event.submitter;

  if (button) {
    button.disabled = true;
  }


  try {

    const data =
      await apiRequest(
        "/auth/login",
        {
          method: "POST",

          body: JSON.stringify({
            nickname,
            password
          })
        }
      );


    currentUser =
      data.user || null;


    closeAuthModal();

    updateUserUI();

    showToast(
      "Вхід виконано!"
    );


    await refreshAll();


  } catch (error) {

    showResult(
      result,
      error.message,
      "error"
    );

  } finally {

    if (button) {
      button.disabled = false;
    }

  }

}


/* =====================================================
   LOAD CURRENT USER
===================================================== */

async function loadCurrentUser() {

  try {

    const data =
      await apiRequest(
        "/auth/me"
      );

    currentUser =
      data.user || null;


    updateUserUI();


  } catch {

    currentUser = null;

    updateUserUI();

  }

}


/* =====================================================
   USER UI
===================================================== */

function updateUserUI() {

  const nickname =
    $("#headerNickname");

  const avatar =
    $("#headerAvatar");


  if (!currentUser) {

    if (nickname) {
      nickname.textContent = "Гість";
    }

    if (avatar) {
      avatar.innerHTML = "👤";
    }

    return;
  }


  if (nickname) {
    nickname.textContent =
      currentUser.nickname || "Користувач";
  }


  if (avatar) {

    if (currentUser.avatar) {

      avatar.innerHTML =
        `<img src="${escapeHtml(
          currentUser.avatar
        )}" alt="Аватар">`;

    } else {

      avatar.innerHTML = "👤";

    }

  }

}


/* =====================================================
   PROFILE
===================================================== */

function openProfile() {

  if (!currentUser) {

    openAuthModal();

    return;
  }


  const modal =
    $("#profileModal");

  const info =
    $("#profileInfo");


  if (!modal || !info) {
    return;
  }


  const created =
    currentUser.createdAt
      ? formatDate(
          currentUser.createdAt
        )
      : "—";


  info.innerHTML = `

    <div class="profile-row">
      <span>Нік</span>
      <strong>
        ${escapeHtml(
          currentUser.nickname || "—"
        )}
      </strong>
    </div>

    <div class="profile-row">
      <span>Telegram</span>
      <strong>
        ${escapeHtml(
          currentUser.telegramUsername ||
          "Не вказано"
        )}
      </strong>
    </div>

    <div class="profile-row">
      <span>Дата створення</span>
      <strong>
        ${escapeHtml(created)}
      </strong>
    </div>

  `;


  modal.classList.remove(
    "hidden"
  );

}


function closeModal(id) {

  const modal =
    document.getElementById(id);

  if (modal) {
    modal.classList.add(
      "hidden"
    );
  }

}


/* =====================================================
   LOGOUT
===================================================== */

async function logoutUser() {

  try {

    await apiRequest(
      "/auth/logout",
      {
        method: "POST"
      }
    );

  } catch {
    // Навіть якщо сервер вже
    // завершив сесію — очищаємо UI.
  }


  currentUser = null;

  developerAuthenticated = false;

  updateUserUI();

  closeModal("profileModal");

  showToast(
    "Ви вийшли з акаунта."
  );

  openSection("home");

  await refreshAll();

}


/* =====================================================
   NEWS
===================================================== */

async function loadNews() {

  const containers = [
    $("#newsList"),
    $("#homeNews")
  ];


  try {

    const data =
      await apiRequest(
        "/news"
      );


    const news =
      Array.isArray(data.news)
        ? data.news
        : [];


    renderNews(
      $("#newsList"),
      news,
      false
    );

    renderNews(
      $("#homeNews"),
      news.slice(0, 3),
      true
    );


  } catch (error) {

    containers.forEach(
      container => {

        if (!container) return;

        container.innerHTML = `
          <div class="loading-card">
            Не вдалося завантажити новини.
          </div>
        `;

      }
    );

  }

}


/* =====================================================
   RENDER NEWS
===================================================== */

function renderNews(
  container,
  news,
  preview
) {

  if (!container) return;


  if (!news.length) {

    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📰</div>

        <h2>
          Новин поки немає
        </h2>

        <p>
          Нові публікації Clidex Studio
          з'являться тут.
        </p>
      </div>
    `;

    return;
  }


  container.innerHTML =
    news.map(item => {

      const reactions =
        item.reactions || {};


      const totalReactions =
        Object.values(reactions)
          .reduce(
            (sum, value) =>
              sum +
              Number(value || 0),
            0
          );


      const image =
        item.image
          ? `
            <img
              class="news-image"
              src="${escapeHtml(item.image)}"
              alt=""
              loading="lazy"
            >
          `
          : "";


      const game =
        item.gameUrl
          ? `
            <a
              class="news-game"
              href="${escapeHtml(item.gameUrl)}"
              target="_blank"
              rel="noopener noreferrer"
            >
              🎮 Відкрити гру
            </a>
          `
          : "";


      return `
        <article
          class="news-card"
          data-news-id="${escapeHtml(
            String(item.id)
          )}"
        >

          ${image}

          <div class="news-body">

            <div class="news-meta">
              <span>
                🛡️ Clidex Studio
              </span>

              <span>•</span>

              <span>
                ${escapeHtml(
                  formatDate(item.createdAt)
                )}
              </span>
            </div>


            <h2 class="news-title">
              ${escapeHtml(
                item.title || "Без назви"
              )}
            </h2>


            <div class="news-content">
              ${escapeHtml(
                item.content || ""
              )}
            </div>


            ${game}


            <div class="news-actions">

              ${reactionButton(
                item.id,
                "🔥",
                reactions.fire || 0
              )}

              ${reactionButton(
                item.id,
                "❤️",
                reactions.heart || 0
              )}

              ${reactionButton(
                item.id,
                "🤯",
                reactions.wow || 0
              )}

              ${reactionButton(
                item.id,
                "😂",
                reactions.laugh || 0
              )}

              <span class="reaction-count">
                ${totalReactions}
                реакцій
              </span>

            </div>

          </div>

        </article>
      `;

    }).join("");


  if (!preview) {

    container
      .querySelectorAll(
        ".reaction-button"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            reactToNews(
              button.dataset.newsId,
              button.dataset.reaction
            );

          }
        );

      });

  }

}


function reactionButton(
  newsId,
  emoji,
  count
) {

  const type =
    emoji === "🔥"
      ? "fire"
      : emoji === "❤️"
        ? "heart"
        : emoji === "🤯"
          ? "wow"
          : "laugh";


  return `
    <button
      class="reaction-button"
      data-news-id="${escapeHtml(
        String(newsId)
      )}"
      data-reaction="${type}"
      title="Поставити реакцію"
    >
      ${emoji}
      ${Number(count || 0)}
    </button>
  `;
}


/* =====================================================
   REACTION
===================================================== */

async function reactToNews(
  newsId,
  reaction
) {

  if (!currentUser) {

    showToast(
      "Спочатку увійди в акаунт.",
      "error"
    );

    openAuthModal();

    return;
  }


  try {

    await apiRequest(
      `/news/${encodeURIComponent(
        newsId
      )}/reaction`,
      {
        method: "POST",

        body: JSON.stringify({
          reaction
        })
      }
    );


    await loadNews();


  } catch (error) {

    showToast(
      error.message,
      "error"
    );

  }

}


/* =====================================================
   APPLICATION
===================================================== */

async function submitApplication(
  event
) {

  event.preventDefault();


  if (!currentUser) {

    showToast(
      "Для подачі заявки потрібно увійти.",
      "error"
    );

    openAuthModal();

    return;
  }


  const telegram =
    $("#telegramUsername")
      ?.value
      .trim();

  const role =
    $("#wantedRole")
      ?.value;


  const result =
    $("#applicationResult");


  if (!telegram || !role) {

    showResult(
      result,
      "Заповни всі поля.",
      "error"
    );

    return;
  }


  const button =
    event.submitter;

  if (button) {
    button.disabled = true;
  }


  try {

    await apiRequest(
      "/applications",
      {
        method: "POST",

        body: JSON.stringify({
          telegramUsername:
            telegram,
          role
        })
      }
    );


    showResult(
      result,
      "Заявку успішно подано! Очікуй рішення.",
      "success"
    );
event.target.reset();


    showToast(
      "Заявку подано!"
    );


  } catch (error) {

    showResult(
      result,
      error.message,
      "error"
    );

  } finally {

    if (button) {
      button.disabled = false;
    }

  }

}


/* =====================================================
   APPLICATION STATUS
===================================================== */

async function checkApplicationStatus() {

  if (!currentUser) {
    return;
  }


  try {

    const data =
      await apiRequest(
        "/applications/my"
      );


    const application =
      data.application;


    if (!application) {
      return;
    }


    const result =
      $("#applicationResult");


    if (!result) {
      return;
    }


    if (
      application.status ===
      "pending"
    ) {

      showResult(
        result,
        "Твоя заявка зараз розглядається.",
        "success"
      );

    }


    if (
      application.status ===
      "accepted"
    ) {

      showResult(
        result,
        "🎉 Твою заявку прийнято!",
        "success"
      );

    }


    if (
      application.status ===
      "rejected"
    ) {

      showResult(
        result,
        application.reason
          ? `Заявку відхилено: ${application.reason}`
          : "Заявку відхилено.",
        "error"
      );

    }


  } catch {
    // Якщо endpoint недоступний,
    // не ламаємо інтерфейс.
  }

}


/* =====================================================
   MESSAGES
===================================================== */

async function loadMessages() {

  const container =
    $("#messagesList");


  if (!container) {
    return;
  }


  if (!currentUser) {

    container.innerHTML = `
      <div class="empty-state">

        <div class="empty-icon">
          🔐
        </div>

        <h2>
          Потрібен вхід
        </h2>

        <p>
          Увійди в акаунт,
          щоб переглядати повідомлення.
        </p>

        <br>

        <button
          class="primary-button"
          id="messagesLoginButton"
        >
          Увійти
        </button>

      </div>
    `;


    $("#messagesLoginButton")
      ?.addEventListener(
        "click",
        openAuthModal
      );


    updateMessageBadge(0);

    return;
  }


  try {

    const data =
      await apiRequest(
        "/messages"
      );


    const messages =
      Array.isArray(data.messages)
        ? data.messages
        : [];


    renderMessages(
      messages
    );


    updateMessageBadge(
      messages.filter(
        message =>
          !message.read
      ).length
    );


  } catch (error) {

    container.innerHTML = `
      <div class="loading-card">
        Не вдалося завантажити повідомлення.
      </div>
    `;

  }

}


/* =====================================================
   RENDER MESSAGES
===================================================== */

function renderMessages(messages) {

  const container =
    $("#messagesList");


  if (!container) {
    return;
  }


  if (!messages.length) {

    container.innerHTML = `
      <div class="empty-state">

        <div class="empty-icon">
          💬
        </div>

        <h2>
          Повідомлень поки немає
        </h2>

        <p>
          Коли Clidex Studio відповість
          на твою заявку, повідомлення
          з'явиться тут.
        </p>

      </div>
    `;

    return;
  }


  container.innerHTML =
    messages.map(
      message => `

        <article
          class="message-card ${
            message.read
              ? ""
              : "unread"
          }"
        >

          <div class="message-header">

            <div class="message-title">
              ${escapeHtml(
                message.title ||
                "Повідомлення від Clidex Studio"
              )}
            </div>

            <div class="message-date">
              ${escapeHtml(
                formatDate(
                  message.createdAt
                )
              )}
            </div>

          </div>


          <div class="message-content">
            ${escapeHtml(
              message.content || ""
            )}
          </div>


          ${
            !message.read
              ? `
                <button
                  class="message-read"
                  data-message-id="${escapeHtml(
                    String(message.id)
                  )}"
                >
                  ✓ Позначити прочитаним
                </button>
              `
              : `
                <div class="message-read">
                  ✓ Прочитано
                </div>
              `
          }

        </article>

      `
    ).join("");


  container
    .querySelectorAll(
      ".message-read[data-message-id]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          markMessageRead(
            button.dataset.messageId
          );

        }
      );

    });

}


/* =====================================================
   READ MESSAGE
===================================================== */

async function markMessageRead(
  messageId
) {

  try {

    await apiRequest(
      `/messages/${encodeURIComponent(
        messageId
      )}/read`,
      {
        method: "POST"
      }
    );


    await loadMessages();


  } catch (error) {

    showToast(
      error.message,
      "error"
    );

  }

}


/* =====================================================
   MESSAGE BADGE
===================================================== */

function updateMessageBadge(
  count
) {

  const badge =
    $("#messageBadge");


  if (!badge) return;


  if (count > 0) {

    badge.textContent =
      String(count);

    badge.classList.remove(
      "hidden"
    );

  } else {

    badge.classList.add(
      "hidden"
    );

  }

}


/* =====================================================
   GAMES
===================================================== */

async function loadGames() {

  const container =
    $("#gamesList");


  if (!container) {
    return;
  }


  try {

    const data =
      await apiRequest(
        "/games"
      );


    const games =
      Array.isArray(data.games)
        ? data.games
        : [];


    if (!games.length) {

      container.innerHTML = `
        <div class="game-placeholder">

          <div class="game-icon">
            🎮
          </div>

          <h2>
            Ігор поки немає
          </h2>

          <p>
            Коли ми додамо гру,
            вона з'явиться тут.
          </p>

        </div>
      `;

      return;
    }


    container.innerHTML =
      games.map(
        game => `

          <article class="info-card">

            <div class="card-icon">
              🎮
            </div>

            <h3>
              ${escapeHtml(
                game.title || "Гра"
              )}
            </h3>

            <p>
              ${escapeHtml(
                game.description || ""
              )}
            </p>

            ${
              game.url
                ? `
                  <a
                    class="news-game"
                    href="${escapeHtml(game.url)}"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    ▶ Запустити
                  </a>
                `
                : ""
            }

          </article>

        `
      ).join("");


  } catch {

    /*
      Якщо games endpoint ще не
      підключений, показуємо базовий стан.
    */

    container.innerHTML = `
      <div class="game-placeholder">

        <div class="game-icon">
          🎮
        </div>

        <h2>
          Ігри Clidex Studio
        </h2>

        <p>
          Посилання на ігри будуть
          доступні після їх додавання
          через панель розробника.
        </p>

      </div>
    `;

  }

}


/* =====================================================
   DEVELOPER LOGIN
===================================================== */

async function developerLogin(
  event
) {

  event.preventDefault();


  const password =
    $("#developerPassword")
      ?.value || "";


  const result =
    $("#developerLoginResult");


  if (!password) {

    showResult(
      result,
      "Введи пароль.",
      "error"
    );

    return;
  }


  const button =
    event.submitter;

  if (button) {
    button.disabled = true;
  }


  try {

    await apiRequest(
      "/developer/login",
      {
        method: "POST",

        body: JSON.stringify({
          password
        })
      }
    );


    developerAuthenticated =
      true;


    $("#developerPassword").value =
      "";


    $("#developerLogin")
      ?.classList
      .add("hidden");


    $("#developerPanel")
      ?.classList
      .remove("hidden");


    showToast(
      "Доступ до панелі отримано."
    );


    await loadApplications();


  } catch (error) {

    showResult(
      result,
      error.message,
      "error"
    );

  } finally {

    if (button) {
      button.disabled = false;
    }

  }

}


/* =====================================================
   DEVELOPER LOGOUT
===================================================== */

async function developerLogout() {

  try {

    await apiRequest(
      "/developer/logout",
      {
        method: "POST"
      }
    );

  } catch {
    // очищення UI нижче
  }


  developerAuthenticated =
    false;


  $("#developerPanel")
    ?.classList
    .add("hidden");


  $("#developerLogin")
    ?.classList
    .remove("hidden");


  showToast(
    "Вихід із панелі виконано."
  );

}


/* =====================================================
   LOAD APPLICATIONS
===================================================== */

async function loadApplications() {

  const container =
    $("#applicationsList");


  if (!container) {
    return;
  }


  if (!developerAuthenticated) {

    container.innerHTML = `
      <div class="loading-card">
        Потрібна авторизація власника.
      </div>
    `;

    return;
  }


  try {

    const data =
      await apiRequest(
        "/developer/applications"
      );


    const applications =
      Array.isArray(data.applications)
        ? data.applications
        : [];


    renderApplications(
      applications
    );


  } catch (error) {

    container.innerHTML = `
      <div class="loading-card">
        ${escapeHtml(
          error.message
        )}
      </div>
    `;

  }

}


/* =====================================================
   RENDER APPLICATIONS
===================================================== */

function renderApplications(
  applications
) {

  const container =
    $("#applicationsList");


  if (!container) {
    return;
  }


  if (!applications.length) {

    container.innerHTML = `
      <div class="empty-state">

        <div class="empty-icon">
          📋
        </div>

        <h2>
          Заявок немає
        </h2>

        <p>
          Нові заявки користувачів
          з'являться тут.
        </p>

      </div>
    `;

    return;
  }


  container.innerHTML =
    applications.map(
      application => {

        const role =
          roleName(
            application.role
          );


        const status =
          statusName(
            application.status
          );


        const avatar =
          application.avatar
            ? `
              <img
                src="${escapeHtml(
                  application.avatar
                )}"
                alt=""
              >
            `
            : "👤";


        return `
          <article
            class="application-card"
          >

            <div class="application-user">

              <div class="application-avatar">
                ${avatar}
              </div>

              <div>

                <strong>
                  ${escapeHtml(
                    application.nickname ||
                    "Користувач"
                  )}
                </strong>

                <small>
                  ${escapeHtml(
                    application.telegramUsername ||
                    "Telegram не вказано"
                  )}
                </small>

              </div>

            </div>


            <div class="application-info">

              <span class="role-tag">
                ${role}
              </span>

              <span
                class="status-tag ${
                  application.status ===
                  "accepted"
                    ? "status-accepted"
                    : application.status ===
                      "rejected"
                      ? "status-rejected"
                      : "status-pending"
                }"
              >
                ${status}
              </span>

            </div>


            ${
              application.status ===
              "pending"
                ? `
                  <div class="application-actions">

                    <button
                      class="accept-button"
                      data-application-id="${escapeHtml(
                        String(
                          application.id
                        )
                      )}"
                      data-action="accept"
                    >
                      ✓ Прийняти
                    </button>

                    <button
                      class="reject-button"
                      data-application-id="${escapeHtml(
                        String(
                          application.id
                        )
                      )}"
                      data-action="reject"
                    >
                      ✕ Відхилити
                    </button>

                  </div>
                `
                : ""
            }

          </article>
        `;

      }
    ).join("");


  container
    .querySelectorAll(
      "[data-action]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          processApplication(
            button.dataset.applicationId,
            button.dataset.action
          );

        }
      );

    });

}


/* =====================================================
   APPLICATION DECISION
===================================================== */
   async function processApplication(
  applicationId,
  action
) {

  if (!developerAuthenticated) {

    showToast(
      "Немає доступу.",
      "error"
    );

    return;
  }


  let reason = "";


  if (action === "reject") {

    reason =
      prompt(
        "Напиши причину відхилення:"
      );


    if (
      reason === null
    ) {
      return;
    }


    reason =
      reason.trim();


    if (!reason) {

      showToast(
        "Причина не може бути порожньою.",
        "error"
      );

      return;
    }

  }


  if (
    action === "accept"
  ) {

    const confirmed =
      confirm(
        "Прийняти цю заявку?"
      );

    if (!confirmed) {
      return;
    }

  }


  try {

    await apiRequest(
      `/developer/applications/${encodeURIComponent(
        applicationId
      )}/${action}`,
      {
        method: "POST",

        body: JSON.stringify({
          reason
        })
      }
    );


    showToast(
      action === "accept"
        ? "Заявку прийнято."
        : "Заявку відхилено."
    );


    await loadApplications();


  } catch (error) {

    showToast(
      error.message,
      "error"
    );

  }

}


/* =====================================================
   CREATE NEWS
===================================================== */

async function createNews(
  event
) {

  event.preventDefault();


  if (!developerAuthenticated) {

    showToast(
      "Немає доступу.",
      "error"
    );

    return;
  }


  const title =
    $("#newsTitle")
      ?.value
      .trim();

  const content =
    $("#newsContent")
      ?.value
      .trim();

  const gameUrl =
    $("#gameUrl")
      ?.value
      .trim();

  const imageFile =
    $("#newsImage")
      ?.files?.[0];


  const result =
    $("#newsFormResult");


  if (!title || !content) {

    showResult(
      result,
      "Заповни заголовок та текст.",
      "error"
    );

    return;
  }


  const formData =
    new FormData();


  formData.append(
    "title",
    title
  );

  formData.append(
    "content",
    content
  );

  formData.append(
    "gameUrl",
    gameUrl
  );


  if (imageFile) {

    if (
      imageFile.size >
      5 * 1024 * 1024
    ) {

      showResult(
        result,
        "Зображення має бути до 5 МБ.",
        "error"
      );

      return;
    }


    formData.append(
      "image",
      imageFile
    );

  }


  const button =
    event.submitter;

  if (button) {
    button.disabled = true;
  }


  try {

    await apiRequest(
      "/developer/news",
      {
        method: "POST",
        body: formData
      }
    );


    showResult(
      result,
      "Новину успішно опубліковано!",
      "success"
    );


    event.target.reset();


    showToast(
      "Новину опубліковано!"
    );


    await loadNews();


  } catch (error) {

    showResult(
      result,
      error.message,
      "error"
    );

  } finally {

    if (button) {
      button.disabled = false;
    }

  }

}


/* =====================================================
   REFRESH EVERYTHING
===================================================== */

async function refreshAll() {

  await Promise.allSettled([
    loadNews(),
    loadMessages(),
    loadGames()
  ]);

}


/* =====================================================
   CONNECTION STATUS
===================================================== */

async function checkConnection() {

  const dot =
    $("#connectionDot");

  const text =
    $("#connectionText");


  try {

    await apiRequest(
      "/health"
    );


    if (dot) {
      dot.classList.add(
        "online"
      );
    }

    if (text) {
      text.textContent =
        "Сервер онлайн";
    }


  } catch {

    if (dot) {
      dot.classList.remove(
        "online"
      );
    }

    if (text) {
      text.textContent =
        "Сервер недоступний";
    }

  }

}


/* =====================================================
   UTILS
===================================================== */

function escapeHtml(value) {

  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }


  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function formatDate(date) {

  if (!date) {
    return "—";
  }


  const parsed =
    new Date(date);


  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return "—";
  }


  return parsed.toLocaleString(
    "uk-UA",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
  );

}


function roleName(role) {

  const roles = {
    developer:
      "💻 Розробник",

    concept:
      "💡 Концептор",

    artist:
      "🎨 Художник"
  };


  return (
    roles[role] ||
    "👤 Інша роль"
  );

}


function statusName(status) {

  const statuses = {
    pending:
      "⏳ Очікує",

    accepted:
      "✓ Прийнято",

    rejected:
      "✕ Відхилено"
  };


  return (
    statuses[status] ||
    "Невідомо"
  );

}


/* =====================================================
   MODAL EVENTS
===================================================== */

function setupModals() {

  $$("[data-close-modal]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          closeModal(
            button.dataset.closeModal
          );

        }
      );

    });


  $$(".modal-backdrop")
    .forEach(backdrop => {

      backdrop.addEventListener(
        "click",
        () => {

          const modal =
            backdrop.closest(".modal");

          if (modal) {
            modal.classList.add(
              "hidden"
            );
          }

        }
      );

    });


  document.addEventListener(
    "keydown",
    event => {

      if (
        event.key !== "Escape"
      ) {
        return;
      }


      $$(".modal")
        .forEach(modal => {

          if (
            modal.id !==
            "authModal"
          ) {
            modal.classList.add(
              "hidden"
            );
          }

        });

    }
  );

}


/* =====================================================
   EVENT LISTENERS
===================================================== */

function setupEvents() {

  $("#registerForm")
    ?.addEventListener(
      "submit",
      registerUser
    );


  $("#loginForm")
    ?.addEventListener(
      "submit",
      loginUser
    );


  $("#applicationForm")
    ?.addEventListener(
      "submit",
      submitApplication
    );


  $("#developerLoginForm")
    ?.addEventListener(
      "submit",
      developerLogin
    );


  $("#developerLogout")
    ?.addEventListener(
      "click",
      developerLogout
    );


  $("#newsForm")
    ?.addEventListener(
      "submit",
      createNews
    );


  $("#profileButton")
    ?.addEventListener(
      "click",
      openProfile
    );


  $("#logoutButton")
    ?.addEventListener(
      "click",
      logoutUser
    );


  $("#refreshNews")
    ?.addEventListener(
      "click",
      loadNews
    );


  $("#refreshMessages")
    ?.addEventListener(
      "click",
      loadMessages
    );


  $("#refreshApplications")
    ?.addEventListener(
      "click",
      loadApplications
    );

}


/* =====================================================
   START
===================================================== */

async function init() {

  startLoader();

  setupNavigation();

  setupAuthTabs();

  setupAvatarPreview();

  setupModals();

  setupEvents();


  /*
    Спочатку перевіряємо,
    чи є активна сесія.
  */

  await loadCurrentUser();


  /*
    Потім завантажуємо дані.
  */

  await refreshAll();


  /*
    Перевіряємо сервер.
  */

  await checkConnection();


  /*
    Періодично оновлюємо
    новини та повідомлення.
  */

  setInterval(
    async () => {

      await loadNews();

      if (currentUser) {
        await loadMessages();
      }

    },
    30000
  );

}


document.addEventListener(
  "DOMContentLoaded",
  init

