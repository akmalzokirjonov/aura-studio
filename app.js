const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const scenes = {
  sculpture: {
    title: "Liquid poetry",
    image: "./assets/sculpture.png",
    alt: "An organic flower made from flowing bronze ribbons",
    prompt:
      "An organic sculptural bloom in brushed bronze, dramatic studio lighting, a quiet black background.",
  },
  landscape: {
    title: "Somewhere beyond",
    image: "./assets/landscape.jpg",
    alt: "A mountain range rising through atmospheric clouds",
    prompt:
      "A cinematic mountain landscape above the clouds, soft early morning light, a quiet sense of scale and wonder.",
  },
  architecture: {
    title: "Space to imagine",
    image: "./assets/architecture.jpg",
    alt: "Contemporary architecture with sculptural flowing curves",
    prompt:
      "Fluid architectural forms, sculptural lines and soft natural light. Minimal, considered, and quietly monumental.",
  },
};
const drafts = new Map();
let currentScene = "sculpture";
let lastFocus = null;
const studio = $("#studio-dialog");
const film = $("#film-dialog");
const info = $("#info-dialog");

function openDialog(dialog) {
  lastFocus = document.activeElement;
  closeMenu();
  dialog.showModal();
  document.body.classList.add("modal-open");
}
function closeDialog(dialog) {
  dialog.close();
}
$$("dialog").forEach((dialog) => {
  $("[data-close]", dialog).addEventListener("click", () =>
    closeDialog(dialog),
  );
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom
    )
      closeDialog(dialog);
  });
  dialog.addEventListener("close", () => {
    document.body.classList.remove("modal-open");
    lastFocus?.focus({ preventScroll: true });
  });
});

function chooseScene(key) {
  drafts.set(currentScene, $("#creative-prompt").value);
  currentScene = key;
  const scene = scenes[key];
  const image = $("#studio-image");
  image.src = scene.image;
  image.alt = scene.alt;
  $("#scene-title").textContent = scene.title;
  $("#creative-prompt").value = drafts.get(key) ?? scene.prompt;
  const download = $("#download-image");
  download.href = scene.image;
  download.download = `aura-${key}.${key === "sculpture" ? "png" : "jpg"}`;
  $$("[data-pick]").forEach((button) => {
    const active = button.dataset.pick === key;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  $("#studio-status").textContent = "";
}
function openStudio(key = currentScene, plan) {
  chooseScene(key);
  $("#studio-plan").textContent = plan
    ? `${plan} · Plan preview`
    : "A space for your next idea";
  openDialog(studio);
}
$$("[data-open-studio]").forEach((button) =>
  button.addEventListener("click", () => openStudio()),
);
$$("[data-scene]").forEach((button) =>
  button.addEventListener("click", () => openStudio(button.dataset.scene)),
);
$$("[data-pick]").forEach((button) =>
  button.addEventListener("click", () => chooseScene(button.dataset.pick)),
);
$$("[data-plan]").forEach((button) =>
  button.addEventListener("click", () =>
    openStudio(currentScene, button.dataset.plan),
  ),
);

$("#save-brief").addEventListener("click", () => {
  const prompt = $("#creative-prompt").value.trim();
  if (!prompt) {
    $("#studio-status").textContent =
      "Add a little direction to your creative brief first.";
    $("#creative-prompt").focus();
    return;
  }
  const content = `AURA / Creative brief\n\nDirection: ${scenes[currentScene].title}\n\n${prompt}\n\nCreated in the AURA interactive studio concept.\nThe reference is a curated image; this brief has not been sent to an AI service.\n`;
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/plain;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `aura-${currentScene}-brief.txt`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  $("#studio-status").textContent = "Your creative brief is ready to download.";
});

$$("[data-billing]").forEach((button) =>
  button.addEventListener("click", () => {
    const annual = button.dataset.billing === "annual";
    $$("[data-billing]").forEach((option) => {
      const active = option === button;
      option.classList.toggle("active", active);
      option.setAttribute("aria-pressed", String(active));
    });
    $('[data-price="pro"]').textContent = annual ? "19.20" : "24";
    $('[data-price="studio"]').textContent = annual ? "47.20" : "59";
    $('[data-billing-note="pro"]').textContent = annual
      ? "$230.40 billed yearly · Concept plan"
      : "$24 billed monthly · Concept plan";
    $('[data-billing-note="studio"]').textContent = annual
      ? "$566.40 billed yearly · Concept plan"
      : "$59 billed monthly · Concept plan";
  }),
);

function openFilm() {
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  $(".film-frame").classList.toggle("paused", reduceMotion);
  $("#film-toggle").textContent = reduceMotion
    ? "Reduced motion enabled"
    : "Pause animation";
  $("#film-toggle").disabled = reduceMotion;
  openDialog(film);
}
$("#watch-film").addEventListener("click", openFilm);
$$("[data-film]").forEach((button) =>
  button.addEventListener("click", openFilm),
);
$("#film-toggle").addEventListener("click", () => {
  const paused = $(".film-frame").classList.toggle("paused");
  $("#film-toggle").textContent = paused ? "Play animation" : "Pause animation";
});

const menuToggle = $(".menu-toggle");
function closeMenu() {
  $("#mobile-nav").hidden = true;
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Open menu");
}
menuToggle.addEventListener("click", () => {
  const open = menuToggle.getAttribute("aria-expanded") !== "true";
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  $("#mobile-nav").hidden = !open;
});
$$(".mobile-nav a").forEach((link) =>
  link.addEventListener("click", closeMenu),
);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMenu();
});
matchMedia("(min-width: 761px)").addEventListener("change", (event) => {
  if (event.matches) closeMenu();
});

$("#digest-form").addEventListener("submit", (event) => {
  event.preventDefault();
  $("#digest-status").textContent =
    "The digest is coming soon. Your email has not been sent or saved.";
  $("#digest-form").reset();
});
$$("[data-info]").forEach((button) =>
  button.addEventListener("click", () => {
    const privacy = button.dataset.info === "privacy";
    $("#info-title").textContent = privacy
      ? "Your ideas stay yours."
      : "An idea, made tangible.";
    $("#info-body").textContent = privacy
      ? "This preview does not use analytics, cookies, or browser storage. Creative briefs stay in this tab until you download them. The digest form does not send or store email addresses. Site assets are served by GitHub Pages, whose normal hosting logs may include connection information. GitHub links open the external GitHub website."
      : "AURA is an independent creative studio design concept by Akmal Zokirjonov. Explore the canvas, browse curated imagery, and download your creative briefs. Pricing illustrates a potential product; paid subscriptions, live AI generation, team collaboration, and email delivery are not connected. Studio photography is illustrative.";
    openDialog(info);
  }),
);
$("#year").textContent = new Date().getFullYear();

function drawConnections() {
  const canvas = $("#neural-canvas");
  const origin = canvas.getBoundingClientRect();
  const center = $(".central-node").getBoundingClientRect();
  const group = $("#connection-paths");
  group.replaceChildren();
  $$("[data-node]", canvas).forEach((satellite) => {
    const node = $(".node-port", satellite).getBoundingClientRect();
    const left = satellite.dataset.node === "left";
    const fromX = node.left + node.width / 2 - origin.left;
    const fromY = node.top + node.height / 2 - origin.top;
    const toX = (left ? center.left : center.right) - origin.left;
    const toY = center.top + center.height / 2 - origin.top;
    const curve = Math.max(38, Math.abs(toX - fromX) * 0.65);
    const direction = left ? 1 : -1;
    const d = `M ${fromX} ${fromY} C ${fromX + curve * direction} ${fromY}, ${toX - curve * direction} ${toY}, ${toX} ${toY}`;
    ["node-line", "node-flow"].forEach((name) => {
      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      path.setAttribute("d", d);
      path.setAttribute("class", name);
      group.append(path);
    });
  });
}
let connectionFrame;
const scheduleConnections = () => {
  cancelAnimationFrame(connectionFrame);
  connectionFrame = requestAnimationFrame(drawConnections);
};
new ResizeObserver(scheduleConnections).observe($("#neural-canvas"));
window.addEventListener("load", scheduleConnections);
document.fonts.ready.then(scheduleConnections);
$$(".satellite").forEach((card) => {
  card.addEventListener("transitionend", scheduleConnections);
});
