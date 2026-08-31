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


