const restoreBtn = document.querySelector(".restore");
const dialog = document.querySelector(".confirmation-dialog");
const themeToggleBtn = document.querySelector(".theme-toggle");
const filterGroup = document.querySelector(".filter-group");
const extensionList = document.querySelector(".extension-list");
const emptyState = document.querySelector(".empty-state");
const emptyStateRestoreBtn = emptyState.querySelector("button");

// -------------------- state --------------------
let extensions = [];
let currentFilter = "all";

// -------------------- storage --------------------
function getFromLocalStorage() {
  try {
    return JSON.parse(localStorage.getItem("extensions"));
  } catch {
    return null;
  }
}

function save() {
  localStorage.setItem("extensions", JSON.stringify(extensions));
}

// -------------------- data --------------------
async function fetchExtensions() {
  try {
    const response = await fetch("./data.json");
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Error:", error);
    return [];
  }
}

async function initExtensions() {
  const saved = getFromLocalStorage();
  if (saved !== null) {
    extensions = saved;
    return;
  }

  const fetched = await fetchExtensions();
  if (!fetched.length) {
    return;
  }

  extensions = fetched.map((ext) => ({
    ...ext,
    id: crypto.randomUUID(),
  }));

  save();
}

// -------------------- render --------------------
function getVisibleExtensions() {
  if (currentFilter === "active")
    return extensions.filter((ext) => ext.isActive);
  if (currentFilter === "inactive")
    return extensions.filter((ext) => !ext.isActive);
  return extensions;
}

function render() {
  const visible = getVisibleExtensions();
  emptyState.hidden = visible.length > 0;

  extensionList.innerHTML = visible
    .map(
      (ext) =>
        `<li class="extension" data-id="${ext.id}">
        <header class="extension__header">
          <img
            src="${ext.logo}"
            alt=""
            class="extension__logo"
          />
          <div>
            <h2 class="extension__title">${ext.name}</h2>
            <p class="extension__description">
              ${ext.description}
            </p>
          </div>
        </header>
        <footer class="extension__footer">
          <button class="extension__remove" aria-label="Remove ${ext.name}">
            Remove
          </button>
          <label class="toggle-extension">
            <input
              type="checkbox"
              class="toggle-extension__input sr-only"
              aria-label="${ext.isActive ? "Disable" : "Enable"} ${ext.name}"
              ${ext.isActive ? "checked" : ""}
            />
            <span class="toggle-extension__track">
              <span class="toggle-extension__circle"></span>
            </span>
          </label>
        </footer>
      </li>`,
    )
    .join("");
}

// -------------------- actions --------------------
function askConfirmation(message, action) {
  dialog.querySelector("p").textContent = message;
  dialog.querySelector(".confirmation-dialog__btn--confirm").textContent =
    action;
  dialog.showModal();

  return new Promise((resolve) => {
    dialog.addEventListener(
      "close",
      () => resolve(dialog.returnValue === "confirm"),
      { once: true },
    );
  });
}

async function restoreExtensions() {
  const message = "Restore default extensions?";
  const confirmed = await askConfirmation(message, "Restore");
  if (!confirmed) return;

  localStorage.removeItem("extensions");
  await initExtensions();
  render();
}

function toggleTheme() {
  const htmlDataset = document.documentElement.dataset;
  htmlDataset.theme = htmlDataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem("theme", htmlDataset.theme);
}

async function removeExtension(id) {
  const extension = extensions.find((ext) => ext.id === id);
  if (!extension) return;
  const message = `Remove ${extension.name}?`;
  const confirmed = await askConfirmation(message, "Remove");
  if (!confirmed) return;

  extensions = extensions.filter((ext) => ext.id !== id);

  render();
  save();
}

function toggleExtension(id, isEnabled) {
  const extension = extensions.find((ext) => ext.id === id);
  if (!extension) return;

  extension.isActive = isEnabled;

  if (currentFilter !== "all") {
    const circleEl = document.querySelector(".toggle-extension__circle");
    const duration = getComputedStyle(circleEl).transitionDuration;
    setTimeout(render, parseFloat(duration) * 1000);
  }

  save();
}

// -------------------- events --------------------
restoreBtn.addEventListener("click", (e) => {
  restoreExtensions();
});

dialog.addEventListener("click", (e) => {
  if (e.target === dialog) dialog.close();
});

themeToggleBtn.addEventListener("click", toggleTheme);

filterGroup.addEventListener("change", (e) => {
  if (e.target.classList.contains("filter-btn__input")) {
    currentFilter = e.target.value;

    render();
  }
});

extensionList.addEventListener("click", (e) => {
  if (e.target.classList.contains("extension__remove")) {
    const id = e.target.closest(".extension").dataset.id;

    removeExtension(id);
  }
});

extensionList.addEventListener("change", (e) => {
  if (e.target.classList.contains("toggle-extension__input")) {
    const id = e.target.closest(".extension").dataset.id;
    const isEnabled = e.target.checked;

    toggleExtension(id, isEnabled);
  }
});

emptyStateRestoreBtn.addEventListener("click", (e) => {
  restoreExtensions();
});

// -------------------- init --------------------
async function init() {
  await initExtensions();
  render();
}

init();
