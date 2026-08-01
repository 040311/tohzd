const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const hasFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

const lightbox = $("#lightbox");
const lightboxImage = $("#lightboxImage");
const lightboxFigure = $("#lightbox figure");
const lightboxChat = document.createElement("div");
lightboxChat.className = "lightbox-chat-preview";
lightboxChat.hidden = true;
lightboxFigure.prepend(lightboxChat);

let activeGallery = "portraits";
let activeIndex = 0;
let lightboxReturnFocus = null;

const lightboxBackground = $$("body > .reading-progress, body > .site-header, body > main, body > .site-footer");

function setLightboxBackgroundInert(isInert) {
  lightboxBackground.forEach((element) => { element.inert = isInert; });
}

function galleryItems(name) {
  return $$(`[data-gallery="${name}"]`);
}

function syncLightbox() {
  const items = galleryItems(activeGallery);
  const item = items[activeIndex];
  if (!item) return;

  const image = $("img", item);
  const isChatCard = item.classList.contains("chat-frame") && !image;
  lightboxImage.hidden = isChatCard;
  lightboxChat.hidden = !isChatCard;
  if (isChatCard) {
    lightboxChat.replaceChildren(item.cloneNode(true));
  } else {
    lightboxImage.src = item.dataset.fullSrc || image?.src || "";
    lightboxImage.alt = image?.alt || "摄影集照片";
  }

  const caption = $(".image-caption", item)?.firstChild?.textContent?.trim()
    || $(".chat-photo-foot", item)?.textContent?.trim()
    || item.dataset.title
    || "未命名的一页";
  $("#lightboxCaption").textContent = caption;
  const lightboxCounter = $("#lightboxCounter");
  lightboxCounter.hidden = false;
  lightboxCounter.textContent = activeGallery === "chats"
    ? `CHAT ${String(activeIndex + 1).padStart(2, "0")} / ${String(items.length).padStart(2, "0")}`
    : `${String(activeIndex + 1).padStart(2, "0")} / ${String(items.length).padStart(2, "0")}`;
}

function openLightbox(name, index) {
  activeGallery = name;
  activeIndex = Math.max(0, Math.min(index, galleryItems(name).length - 1));
  lightboxReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  syncLightbox();
  setLightboxBackgroundInert(true);
  lightbox.hidden = false;
  document.body.classList.add("is-locked");
  $("#lightboxClose").focus();
}

function closeLightbox() {
  lightbox.hidden = true;
  lightbox.classList.remove("is-swipe-next", "is-swipe-prev");
  lightboxSwipeActive = false;
  document.body.classList.remove("is-locked");
  setLightboxBackgroundInert(false);
  if (lightboxReturnFocus?.isConnected) lightboxReturnFocus.focus({ preventScroll: true });
  lightboxReturnFocus = null;
}

function moveLightbox(direction) {
  const items = galleryItems(activeGallery);
  activeIndex = (activeIndex + direction + items.length) % items.length;
  syncLightbox();
}

let lightboxSwipeActive = false;
function animateLightboxMove(direction) {
  if (lightboxSwipeActive) return;
  lightboxSwipeActive = true;
  const className = direction > 0 ? "is-swipe-next" : "is-swipe-prev";
  lightbox.classList.add(className);
  window.setTimeout(() => moveLightbox(direction), prefersReducedMotion ? 0 : 190);
  window.setTimeout(() => {
    lightbox.classList.remove(className);
    lightboxSwipeActive = false;
  }, prefersReducedMotion ? 20 : 430);
}

function bindGalleryCards() {
  $$("[data-gallery]").forEach((card) => {
    if (card.dataset.bound === "true") return;
    card.dataset.bound = "true";
    bindTilt(card);
    const activate = () => openLightbox(card.dataset.gallery, galleryItems(card.dataset.gallery).indexOf(card));
    card.addEventListener("click", activate);
    if (!(card instanceof HTMLButtonElement) && !(card instanceof HTMLAnchorElement)) {
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activate();
        }
      });
    }
  });
}

$("#lightboxClose").addEventListener("click", closeLightbox);
$("#lightboxPrev").addEventListener("click", () => animateLightboxMove(-1));
$("#lightboxNext").addEventListener("click", () => animateLightboxMove(1));
lightbox.addEventListener("click", (event) => {
  if (event.target === lightbox) closeLightbox();
});
document.addEventListener("keydown", (event) => {
  if (lightbox.hidden) return;
  if (event.key === "Escape") closeLightbox();
  if (event.key === "ArrowLeft") moveLightbox(-1);
  if (event.key === "ArrowRight") moveLightbox(1);
  if (event.key === "Tab") {
    const focusable = [$("#lightboxClose"), $("#lightboxPrev"), $("#lightboxNext")];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});

let lightboxPointerStart = null;
lightboxFigure.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  lightboxPointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
  lightboxFigure.setPointerCapture?.(event.pointerId);
});
lightboxFigure.addEventListener("pointerup", (event) => {
  if (!lightboxPointerStart || lightboxPointerStart.id !== event.pointerId) return;
  const deltaX = event.clientX - lightboxPointerStart.x;
  const deltaY = event.clientY - lightboxPointerStart.y;
  lightboxPointerStart = null;
  if (Math.abs(deltaX) > 52 && Math.abs(deltaX) > Math.abs(deltaY) * 1.15) {
    animateLightboxMove(deltaX < 0 ? 1 : -1);
  }
});
lightboxFigure.addEventListener("pointercancel", () => { lightboxPointerStart = null; });
if (hasFinePointer) {
  let wheelReleaseTimer = 0;
  lightbox.addEventListener("wheel", (event) => {
    if (lightbox.hidden || lightboxSwipeActive || Math.abs(event.deltaY) < 18) return;
    event.preventDefault();
    animateLightboxMove(event.deltaY > 0 ? 1 : -1);
    window.clearTimeout(wheelReleaseTimer);
    wheelReleaseTimer = window.setTimeout(() => { lightboxSwipeActive = false; }, 520);
  }, { passive: false });
}

$("#birthdayWish").addEventListener("click", () => {
  const cake = $("#birthdayCake");
  const note = $("#birthdayWishNote");
  const isLit = cake.classList.toggle("is-lit");
  note.hidden = !isLit;
  $("#birthdayWish").classList.toggle("is-lit", isLit);
  $("#birthdayWish").firstChild.textContent = isLit ? "华紫蝶，这一岁已经点亮 " : "点这里，点亮这一岁 ";
  if (isLit) {
    burstFromElement($("#birthdayCake"), 54);
    runFairytaleCelebration();
  } else {
    stopFairytaleCelebration();
    document.body.classList.remove("celebration-live");
  }
});

$(".cover-cta").addEventListener("click", () => runGrandCelebration(false));

const pageTurn = $("#pageTurn");
const pageTurnButton = $("#pageTurnButton");
let pageTurnInProgress = false;

pageTurnButton.addEventListener("click", () => {
  if (pageTurnInProgress) return;
  if (prefersReducedMotion) {
    $("#her").scrollIntoView({ behavior: "auto", block: "start" });
    return;
  }

  pageTurnInProgress = true;
  pageTurnButton.disabled = true;
  pageTurn.classList.add("is-turning");
  burstFromElement(pageTurnButton, 48);

  window.setTimeout(() => {
    $("#her").scrollIntoView({ behavior: "auto", block: "start" });
  }, 520);
  window.setTimeout(() => {
    pageTurn.classList.remove("is-turning");
    pageTurnButton.disabled = false;
    pageTurnInProgress = false;
  }, 1120);
});

$("#futureButton").addEventListener("click", () => {
  const note = $("#futureNote");
  const isOpen = !note.hidden;
  note.hidden = isOpen;
  $("#futureButtonText").textContent = isOpen ? "拆开这份预告" : "合上这份预告";
  if (!isOpen) burstFromElement($("#futureButton"), 22);
});

const letterOpen = $("#letterOpen");
const letterCover = $("#letterCover");
const letterInside = $("#letterInside");
const letterTitle = $("#letterTitle");
const letterBody = $(".letter-body");
const letterSign = $(".letter-sign");
const letterRevealAll = $("#letterRevealAll");
const letterSection = $("#letter");
const letterFlightPaths = $("#letterFlightPaths");
const letterButterflyCanvas = $("#letterButterflyDust");
const letterButterflyField = $("#letterButterflyField");
const letterButterflyContext = letterButterflyCanvas?.getContext("2d", { alpha: true });
const letterSvgNamespace = "http://www.w3.org/2000/svg";
let letterOpening = false;
let letterWritingTimer = 0;
let letterWritingIndex = 0;
let letterWritingActive = false;
let letterAutoFollow = true;
let letterLastFollowAt = 0;
const letterGlyphs = [];
let letterButterflyWidth = 1;
let letterButterflyHeight = 1;
let letterButterflyDpr = 1;
let letterButterflyFrame = 0;
let letterButterflyLastFrame = 0;
let letterButterflyActive = false;
let letterDustParticles = [];
let letterButterflySafeZones = [];

const letterButterflyPalettes = [
  { className: "azure", dust: "164,222,238" },
  { className: "pearl", dust: "224,245,249" },
  { className: "lilac", dust: "202,205,232" },
];

const letterFlightRoutes = [
  [[.82, 1.12], [.92, .78], [.69, .24], [.8, -.12]],
  [[1.12, .78], [.82, .96], [.28, .63], [-.12, .86]],
  [[-.12, .43], [.22, .22], [.68, .08], [1.12, .35]],
  [[-.12, .72], [.22, .93], [.72, .57], [1.12, .82]],
  [[1.12, .12], [.76, .28], [.34, .02], [-.12, .17]],
];

const letterButterflies = [
  { period: 22.5, offset: .14, size: 106, mobileSize: 74, depth: .96, palette: 0, alpha: .9, phase: .4, flapCycle: 2.32, flapWindow: .78, flapRate: 5 },
  { period: 25.5, offset: .56, size: 76, mobileSize: 54, depth: .7, palette: 1, alpha: .78, phase: 2.2, flapCycle: 2.75, flapWindow: .86, flapRate: 4.5 },
  { period: 28.5, offset: .29, size: 54, mobileSize: 39, depth: .4, palette: 0, alpha: .62, phase: 4.1, flapCycle: 2.58, flapWindow: .72, flapRate: 5.8 },
  { period: 23, offset: .73, size: 64, mobileSize: 46, depth: .57, palette: 2, alpha: .68, phase: 1.3, flapCycle: 2.9, flapWindow: .82, flapRate: 4.8 },
  { period: 31, offset: .42, size: 42, mobileSize: 30, depth: .25, palette: 1, alpha: .5, phase: 3.4, flapCycle: 3.15, flapWindow: .7, flapRate: 6.2 },
].map((butterfly, index) => ({
  ...butterfly,
  route: index,
  path: null,
  pathLength: 1,
  element: null,
  bankElement: null,
  visualElement: null,
  leftWing: null,
  rightWing: null,
  opacity: 0,
  bank: 0,
  lastAngle: null,
  dustAt: 0,
  previousOpen: 1,
}));

function resizeLetterButterflyCanvas() {
  if (!letterButterflyContext || !letterFlightPaths || !letterButterflyField || letterOpening) return;
  const rect = letterButterflyCanvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  letterButterflyWidth = rect.width;
  letterButterflyHeight = rect.height;
  letterButterflyDpr = Math.min(window.devicePixelRatio || 1, rect.width < 640 ? 1.5 : 2);
  letterButterflyCanvas.width = Math.round(rect.width * letterButterflyDpr);
  letterButterflyCanvas.height = Math.round(rect.height * letterButterflyDpr);
  letterButterflyContext.setTransform(letterButterflyDpr, 0, 0, letterButterflyDpr, 0, 0);
  letterDustParticles = [];
  letterFlightPaths.setAttribute("viewBox", `0 0 ${letterButterflyWidth} ${letterButterflyHeight}`);
  const canvasRect = letterButterflyCanvas.getBoundingClientRect();
  letterButterflySafeZones = [".letter-label", ".letter-envelope__address", ".letter-open"]
    .map((selector) => letterSection.querySelector(selector))
    .filter(Boolean)
    .map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left - canvasRect.left,
        right: rect.right - canvasRect.left,
        top: rect.top - canvasRect.top,
        bottom: rect.bottom - canvasRect.top,
      };
    });
  rebuildLetterFlightPaths();

  const mobile = letterButterflyWidth < 640;
  letterButterflies.forEach((butterfly, index) => {
    if (!butterfly.element) return;
    butterfly.element.style.setProperty("--butterfly-size", `${mobile ? butterfly.mobileSize : butterfly.size}px`);
    butterfly.element.style.display = index < (mobile ? 3 : 5) ? "" : "none";
    butterfly.element.style.zIndex = String(Math.round(butterfly.depth * 10));
  });
}

function letterFlightPathData(route, yShift = 0) {
  const points = route.map(([x, y]) => {
    const shiftedY = Math.max(-.08, Math.min(1.08, y + yShift));
    return [x * letterButterflyWidth, shiftedY * letterButterflyHeight];
  });
  return `M ${points[0][0]} ${points[0][1]} C ${points[1][0]} ${points[1][1]}, ${points[2][0]} ${points[2][1]}, ${points[3][0]} ${points[3][1]}`;
}

function scoreLetterFlightPath(path, size) {
  const length = Math.max(1, path.getTotalLength());
  const padding = size * .55 + (letterButterflyWidth < 640 ? 12 : 20);
  let score = 0;
  for (let index = 0; index <= 36; index += 1) {
    const point = path.getPointAtLength(length * index / 36);
    letterButterflySafeZones.forEach((zone) => {
      if (point.x > zone.left - padding && point.x < zone.right + padding
        && point.y > zone.top - padding && point.y < zone.bottom + padding) score += 1;
    });
  }
  return score;
}

function rebuildLetterFlightPaths() {
  letterFlightPaths.replaceChildren();
  const mobile = letterButterflyWidth < 640;
  letterButterflies.forEach((butterfly) => {
    const path = document.createElementNS(letterSvgNamespace, "path");
    path.setAttribute("fill", "none");
    path.setAttribute("vector-effect", "non-scaling-stroke");
    letterFlightPaths.append(path);

    const route = letterFlightRoutes[butterfly.route];
    const shifts = [0, -.08, .08, -.16, .16];
    let bestPath = letterFlightPathData(route);
    let bestScore = Number.POSITIVE_INFINITY;
    shifts.forEach((shift) => {
      const candidate = letterFlightPathData(route, shift);
      path.setAttribute("d", candidate);
      const score = scoreLetterFlightPath(path, mobile ? butterfly.mobileSize : butterfly.size);
      if (score < bestScore) {
        bestScore = score;
        bestPath = candidate;
      }
    });
    path.setAttribute("d", bestPath);
    butterfly.path = path;
    butterfly.pathLength = Math.max(1, path.getTotalLength());
  });
}

function letterButterflyPosition(butterfly, now) {
  const progress = ((now / 1000 / butterfly.period + butterfly.offset) % 1 + 1) % 1;
  const distance = butterfly.pathLength * progress;
  const tangentStep = Math.max(3, butterfly.pathLength * .0025);
  const point = butterfly.path.getPointAtLength(distance);
  const behind = butterfly.path.getPointAtLength(Math.max(0, distance - tangentStep));
  const ahead = butterfly.path.getPointAtLength(Math.min(butterfly.pathLength, distance + tangentStep));
  const angle = Math.atan2(ahead.y - behind.y, ahead.x - behind.x);
  const bob = Math.sin(now * .0011 + butterfly.phase) * (1.5 + butterfly.depth * 3.5)
    + Math.sin(now * .0023 + butterfly.phase * 1.7) * (1 + butterfly.depth);
  return {
    x: point.x - Math.sin(angle) * bob,
    y: point.y + Math.cos(angle) * bob,
    angle,
  };
}

function butterflyFocusOpacity(x, y, size) {
  let opacity = 1;
  const padding = size * .72 + (letterButterflyWidth < 640 ? 11 : 17);
  letterButterflySafeZones.forEach((zone) => {
    const dx = Math.max(zone.left - padding - x, 0, x - zone.right - padding);
    const dy = Math.max(zone.top - padding - y, 0, y - zone.bottom - padding);
    const zoneOpacity = Math.min(1, Math.hypot(dx, dy) / (letterButterflyWidth < 640 ? 34 : 48));
    opacity = Math.min(opacity, zoneOpacity);
  });
  return opacity;
}

function letterButterflyWingSvg(index, side) {
  const left = side === "left";
  const id = `letter-wing-${index}-${side}`;
  const forewing = left
    ? "M58.6 68.4C52.7 51.2 42.3 29.1 27.8 17.2C17.1 8.4 6.9 13.3 5.7 27.2C4.2 42.8 14.2 56.8 29.3 64.9C39.8 70.4 50.3 72 57.4 70.2C59.3 69.7 59.8 69.2 58.6 68.4Z"
    : "M61.4 68.4C67.3 51.2 77.7 29.1 92.2 17.2C102.9 8.4 113.1 13.3 114.3 27.2C115.8 42.8 105.8 56.8 90.7 64.9C80.2 70.4 69.7 72 62.6 70.2C60.7 69.7 60.2 69.2 61.4 68.4Z";
  const hindwing = left
    ? "M58.2 68.7C46.2 66.3 31.7 69.2 19.2 77.2C8.4 84.2 6.8 97.9 14.9 108.9C20.2 116.1 27.2 120.5 31.8 126.3C34.2 129.4 35.5 124.2 35.9 120C40 118.7 44.1 113.9 47.5 105.8C54.5 96.4 59.2 82.7 61.2 73C62 70 60.5 69 58.2 68.7Z"
    : "M61.8 68.7C73.8 66.3 88.3 69.2 100.8 77.2C111.6 84.2 113.2 97.9 105.1 108.9C99.8 116.1 92.8 120.5 88.2 126.3C85.8 129.4 84.5 124.2 84.1 120C80 118.7 75.9 113.9 72.5 105.8C65.5 96.4 60.8 82.7 58.8 73C58 70 59.5 69 61.8 68.7Z";
  const veins = left
    ? "M58 69C46 57 34 38 26 18M56 68C41 63 23 49 7 32M52 71C36 71 20 66 10 55M58 72C45 80 31 94 17 108M56 78C42 84 28 93 11 96M53 91C41 101 32 111 25 116"
    : "M62 69C74 57 86 38 94 18M64 68C79 63 97 49 113 32M68 71C84 71 100 66 110 55M62 72C75 80 89 94 103 108M64 78C78 84 92 93 109 96M67 91C79 101 88 111 95 116";
  const rim = left
    ? "M27.8 17.2C17.1 8.4 6.9 13.3 5.7 27.2C4.2 42.8 14.2 56.8 29.3 64.9M19.2 77.2C8.4 84.2 6.8 97.9 14.9 108.9C23.7 120.9 38.4 118.1 47.5 105.8"
    : "M92.2 17.2C102.9 8.4 113.1 13.3 114.3 27.2C115.8 42.8 105.8 56.8 90.7 64.9M100.8 77.2C111.6 84.2 113.2 97.9 105.1 108.9C96.3 120.9 81.6 118.1 72.5 105.8";
  const pearlX = left ? 16 : 104;
  const gradientX = left ? 7 : 113;

  return `<svg viewBox="0 0 120 140" width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <defs>
      <radialGradient id="${id}-surface" gradientUnits="userSpaceOnUse" cx="60" cy="70" r="58" fx="${left ? 53 : 67}" fy="56"><stop offset="0" stop-color="var(--wing-pearl)"/><stop offset=".24" stop-color="var(--wing-light)"/><stop offset=".62" stop-color="var(--wing-mid)"/><stop offset="1" stop-color="var(--wing-deep)"/></radialGradient>
      <linearGradient id="${id}-sheen" gradientUnits="userSpaceOnUse" x1="60" y1="72" x2="${gradientX}" y2="20"><stop stop-color="#fff" stop-opacity=".58"/><stop offset=".46" stop-color="var(--wing-light)" stop-opacity=".24"/><stop offset=".72" stop-color="#c9c9e8" stop-opacity=".32"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <linearGradient id="${id}-shadow" gradientUnits="userSpaceOnUse" x1="60" y1="70" x2="${gradientX}" y2="74"><stop stop-color="var(--body-ink)" stop-opacity=".45"/><stop offset=".48" stop-color="var(--body-ink)" stop-opacity=".05"/><stop offset="1" stop-color="var(--body-ink)" stop-opacity="0"/></linearGradient>
    </defs>
    <path class="wing-surface" d="${hindwing}" fill="url(#${id}-surface)"/><path class="wing-surface" d="${forewing}" fill="url(#${id}-surface)"/>
    <path class="wing-shadow" d="${hindwing}" fill="url(#${id}-shadow)"/><path class="wing-shadow" d="${forewing}" fill="url(#${id}-shadow)"/>
    <path class="wing-sheen" d="${hindwing}" fill="url(#${id}-sheen)"/><path class="wing-sheen" d="${forewing}" fill="url(#${id}-sheen)"/>
    <path class="wing-vein" d="${veins}"/><path class="wing-rim" d="${rim}"/>
    <ellipse class="wing-pearl" cx="${pearlX}" cy="45" rx="1.7" ry="4.2" transform="rotate(${left ? -18 : 18} ${pearlX} 45)"/>
    <ellipse class="wing-pearl" cx="${left ? 20 : 100}" cy="99" rx="1.5" ry="3.4" opacity=".42"/>
  </svg>`;
}

function letterButterflyBodySvg(index) {
  const id = `letter-body-${index}`;
  return `<svg viewBox="0 0 120 140" width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <defs><linearGradient id="${id}" x1="54" y1="54" x2="65" y2="120" gradientUnits="userSpaceOnUse"><stop stop-color="var(--wing-light)"/><stop offset=".22" stop-color="var(--body-ink)"/><stop offset="1" stop-color="#183c4e"/></linearGradient></defs>
    <path class="antenna" d="M58.2 43C54.5 33.5 48 26.8 40.5 25.5C38.2 25.1 36.5 26.6 36.8 29M61.8 43C65.5 33.5 72 26.8 79.5 25.5C81.8 25.1 83.5 26.6 83.2 29"/>
    <circle class="antenna-tip" cx="36.8" cy="29" r="1.15"/><circle class="antenna-tip" cx="83.2" cy="29" r="1.15"/>
    <circle cx="60" cy="44" r="4.4" fill="url(#${id})"/><ellipse cx="60" cy="59" rx="5.4" ry="12.8" fill="url(#${id})"/>
    <path d="M56.8 67C55.8 80 57 108 60 130C63 108 64.2 80 63.2 67C62.5 63 57.5 63 56.8 67Z" fill="url(#${id})"/>
    <path class="body-line" d="M57.2 78Q60 80 62.8 78M57.4 89Q60 91 62.6 89M58 101Q60 103 62 101M58.5 113Q60 115 61.5 113"/>
  </svg>`;
}

function createLetterButterflies() {
  if (!letterButterflyField) return;
  const fragment = document.createDocumentFragment();
  letterButterflies.forEach((butterfly, index) => {
    const palette = letterButterflyPalettes[butterfly.palette];
    const element = document.createElement("div");
    element.className = `letter-butterfly letter-butterfly--${palette.className}`;
    element.style.setProperty("--butterfly-size", `${butterfly.size}px`);
    element.innerHTML = `<div class="letter-butterfly__bank"><div class="letter-butterfly__visual">
      <div class="letter-butterfly__wing letter-butterfly__wing--left">${letterButterflyWingSvg(index, "left")}</div>
      <div class="letter-butterfly__wing letter-butterfly__wing--right">${letterButterflyWingSvg(index, "right")}</div>
      <div class="letter-butterfly__body">${letterButterflyBodySvg(index)}</div>
    </div></div>`;
    butterfly.element = element;
    butterfly.bankElement = element.querySelector(".letter-butterfly__bank");
    butterfly.visualElement = element.querySelector(".letter-butterfly__visual");
    butterfly.leftWing = element.querySelector(".letter-butterfly__wing--left");
    butterfly.rightWing = element.querySelector(".letter-butterfly__wing--right");
    fragment.append(element);
  });
  letterButterflyField.replaceChildren(fragment);
}

function emitLetterButterflyDust(butterfly, x, y, angle, size, openness, alpha, now) {
  const openingPeak = openness > .84 && butterfly.previousOpen <= .84;
  butterfly.previousOpen = openness;
  if (!openingPeak || alpha < .28 || now < butterfly.dustAt) return;
  const mobile = letterButterflyWidth < 640;
  butterfly.dustAt = now + (mobile ? 760 : 520) + Math.random() * 420;
  const palette = letterButterflyPalettes[butterfly.palette];
  const count = !mobile && Math.random() > .78 ? 2 : 1;
  for (let index = 0; index < count; index += 1) {
    const side = Math.random() > .5 ? 1 : -1;
    const life = .95 + Math.random() * .75;
    letterDustParticles.push({
      x: x - Math.cos(angle) * size * .14 + Math.sin(angle) * side * size * .2,
      y: y - Math.sin(angle) * size * .14 - Math.cos(angle) * side * size * .2,
      vx: -Math.cos(angle) * (2 + Math.random() * 4) + (Math.random() - .5) * 5,
      vy: -Math.sin(angle) * (2 + Math.random() * 4) - 4 - Math.random() * 5,
      size: .45 + Math.random() * .75,
      life,
      maxLife: life,
      alpha: alpha * (.28 + Math.random() * .28),
      color: palette.dust,
      glint: Math.random() > .88,
    });
  }
  const limit = mobile ? 26 : 56;
  if (letterDustParticles.length > limit) letterDustParticles.splice(0, letterDustParticles.length - limit);
}

function drawLetterButterflyDust(delta) {
  const context = letterButterflyContext;
  context.save();
  context.globalCompositeOperation = "screen";
  letterDustParticles.forEach((particle) => {
    particle.life -= delta;
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.vx *= Math.pow(.965, delta * 60);
    particle.vy -= 1.2 * delta;
    const age = 1 - Math.max(0, particle.life) / particle.maxLife;
    const alpha = Math.sin(Math.PI * Math.min(1, age)) * particle.alpha;
    context.globalAlpha = alpha;
    context.fillStyle = `rgb(${particle.color})`;
    context.shadowColor = `rgba(${particle.color},${alpha})`;
    context.shadowBlur = particle.size * 4;
    if (particle.glint) {
      context.fillRect(particle.x - particle.size * 1.8, particle.y - .25, particle.size * 3.6, .5);
      context.fillRect(particle.x - .25, particle.y - particle.size * 1.8, .5, particle.size * 3.6);
    } else {
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      context.fill();
    }
  });
  context.restore();
  letterDustParticles = letterDustParticles.filter((particle) => particle.life > 0);
}

function animateLetterButterflies(now) {
  if (!letterButterflyActive || !letterButterflyContext || !letterButterflyField) {
    letterButterflyFrame = 0;
    return;
  }
  const delta = Math.min(.05, Math.max(.001, (now - letterButterflyLastFrame) / 1000 || .0167));
  letterButterflyLastFrame = now;
  letterButterflyContext.clearRect(0, 0, letterButterflyWidth, letterButterflyHeight);
  drawLetterButterflyDust(delta);

  const mobile = letterButterflyWidth < 640;
  const visibleButterflies = mobile ? letterButterflies.slice(0, 3) : letterButterflies;
  visibleButterflies.forEach((butterfly) => {
    if (!butterfly.path || !butterfly.element) return;
    const position = letterButterflyPosition(butterfly, now);
    const size = mobile ? butterfly.mobileSize : butterfly.size;
    const alpha = butterfly.alpha * butterflyFocusOpacity(position.x, position.y, size);
    butterfly.opacity += (alpha - butterfly.opacity) * Math.min(1, delta * 4.6);

    const seconds = now / 1000;
    const behavior = ((seconds + butterfly.phase * .37) % butterfly.flapCycle + butterfly.flapCycle) % butterfly.flapCycle;
    let openness;
    if (behavior < butterfly.flapWindow) {
      const flapPulse = (1 - Math.cos(behavior * Math.PI * 2 * butterfly.flapRate)) * .5;
      openness = .17 + .83 * Math.pow(flapPulse, .64);
    } else {
      openness = .91 + Math.sin(seconds * 1.55 + butterfly.phase) * .045;
    }
    const fold = 7 + (1 - openness) * 64;

    if (butterfly.lastAngle !== null) {
      let angleDelta = position.angle - butterfly.lastAngle;
      angleDelta = Math.atan2(Math.sin(angleDelta), Math.cos(angleDelta));
      const targetBank = Math.max(-13, Math.min(13, angleDelta / delta * 18));
      butterfly.bank += (targetBank - butterfly.bank) * Math.min(1, delta * 3.8);
    }
    butterfly.lastAngle = position.angle;

    const depthScale = .84 + butterfly.depth * .16;
    const depthZ = -18 + butterfly.depth * 42;
    const heading = position.angle * 180 / Math.PI + 90;
    butterfly.element.style.opacity = butterfly.opacity.toFixed(3);
    butterfly.element.style.transform = `translate3d(${(position.x - size * .5).toFixed(2)}px, ${(position.y - size * 3 / 8).toFixed(2)}px, ${depthZ.toFixed(1)}px) rotateZ(${heading.toFixed(2)}deg) scale(${depthScale.toFixed(3)})`;
    butterfly.element.style.setProperty("--wing-fold", `${fold.toFixed(2)}deg`);
    butterfly.element.style.setProperty("--wing-fold-right", `${(-fold).toFixed(2)}deg`);
    butterfly.element.style.setProperty("--pitch", `${Math.max(-7, Math.min(7, -Math.sin(position.angle) * 5)).toFixed(2)}deg`);
    butterfly.bankElement.style.transform = `rotateY(${(butterfly.bank * 1.15).toFixed(2)}deg) rotateZ(${(butterfly.bank * .22).toFixed(2)}deg)`;
    emitLetterButterflyDust(butterfly, position.x, position.y, position.angle, size, openness, butterfly.opacity, now);
  });
  letterButterflyFrame = window.requestAnimationFrame(animateLetterButterflies);
}

function setLetterButterflyActive(active) {
  const shouldRun = Boolean(active && !prefersReducedMotion && !letterOpening
    && letterButterflyContext && letterFlightPaths && letterButterflyField);
  letterButterflyActive = shouldRun;
  if (shouldRun && !letterButterflyFrame) {
    resizeLetterButterflyCanvas();
    letterButterflyLastFrame = performance.now();
    letterButterflyFrame = window.requestAnimationFrame(animateLetterButterflies);
  } else if (!shouldRun && letterButterflyFrame) {
    window.cancelAnimationFrame(letterButterflyFrame);
    letterButterflyFrame = 0;
  }
}

function releaseLetterButterflyAtmosphere() {
  setLetterButterflyActive(false);
  letterDustParticles = [];
  if (letterButterflyContext) {
    letterButterflyContext.clearRect(0, 0, letterButterflyWidth, letterButterflyHeight);
    letterButterflyCanvas.width = 0;
    letterButterflyCanvas.height = 0;
  }
  letterFlightPaths?.replaceChildren();
  letterButterflyField?.replaceChildren();
  letterButterflies.forEach((butterfly) => {
    butterfly.path = null;
    butterfly.element = null;
    butterfly.bankElement = null;
    butterfly.visualElement = null;
    butterfly.leftWing = null;
    butterfly.rightWing = null;
  });
}

createLetterButterflies();

function splitLetterText(element, paragraphPause = 0) {
  const text = element.textContent;
  const segmenter = typeof Intl.Segmenter === "function" ? new Intl.Segmenter("zh-CN", { granularity: "grapheme" }) : null;
  const characters = segmenter ? [...segmenter.segment(text)].map((part) => part.segment) : Array.from(text);
  const fragment = document.createDocumentFragment();
  element.setAttribute("aria-label", text);

  characters.forEach((character, index) => {
    const glyph = document.createElement("span");
    glyph.className = "letter-glyph";
    glyph.setAttribute("aria-hidden", "true");
    glyph.textContent = character;
    glyph.style.setProperty("--ink-turn", `${((Math.random() - .5) * .7).toFixed(2)}deg`);
    glyph.style.setProperty("--ink-rise", `${((Math.random() - .5) * .8).toFixed(2)}px`);
    fragment.append(glyph);
    letterGlyphs.push({
      element: glyph,
      character,
      pause: index === characters.length - 1 ? paragraphPause : 0,
    });
  });

  element.replaceChildren(fragment);
}

function prepareLetterWriting() {
  splitLetterText(letterTitle, 520);
  $$(".letter-body p").forEach((paragraph) => splitLetterText(paragraph, 620));
  letterInside.classList.add("is-writing");
}

function letterDelayFor({ character, pause }) {
  let delay = 82 + Math.random() * 38;
  if (/[，、；：,;:]/.test(character)) delay += 125;
  if (/[。！？!?]/.test(character)) delay += 300;
  return delay + pause;
}

function followWritingPosition(glyph) {
  if (!letterAutoFollow || letterWritingIndex % 4 !== 0) return;
  const now = performance.now();
  if (now - letterLastFollowAt < 780) return;
  const rect = glyph.getBoundingClientRect();
  const readingLine = window.innerHeight * .66;
  if (rect.bottom <= readingLine) return;
  letterLastFollowAt = now;
  const needsImmediateCatchUp = rect.bottom > window.innerHeight - 54;
  const distance = rect.bottom - window.innerHeight * .54;
  if (needsImmediateCatchUp) {
    const root = document.documentElement;
    const previousBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollBy(0, distance);
    root.style.scrollBehavior = previousBehavior;
    return;
  }
  window.scrollBy({ top: distance, behavior: "smooth" });
}

function finishLetterWriting(withFlourish = false) {
  window.clearTimeout(letterWritingTimer);
  letterWritingActive = false;
  letterGlyphs.forEach(({ element }) => element.classList.add("is-visible"));
  letterGlyphs.forEach(({ element }) => element.classList.remove("is-writing-tip"));
  letterInside.classList.remove("is-writing");
  letterInside.classList.add("is-written");
  letterSign.classList.add("is-visible");
  letterRevealAll.hidden = true;
  if (withFlourish) {
    burstFromElement(letterSign, 14);
    playWishChime(2);
  }
}

function writeNextLetterGlyph() {
  if (!letterWritingActive) return;
  const previous = letterGlyphs[letterWritingIndex - 1]?.element;
  previous?.classList.remove("is-writing-tip");

  const glyph = letterGlyphs[letterWritingIndex];
  if (!glyph) {
    finishLetterWriting(true);
    return;
  }

  glyph.element.classList.add("is-visible", "is-writing-tip");
  letterWritingIndex += 1;
  followWritingPosition(glyph.element);
  letterWritingTimer = window.setTimeout(writeNextLetterGlyph, letterDelayFor(glyph));
}

function startLetterWriting() {
  if (prefersReducedMotion) {
    finishLetterWriting(false);
    return;
  }
  letterWritingIndex = 0;
  letterWritingActive = true;
  letterAutoFollow = true;
  letterLastFollowAt = 0;
  letterRevealAll.hidden = false;
  writeNextLetterGlyph();
}

function stopLetterAutoFollow() {
  if (letterWritingActive) letterAutoFollow = false;
}

prepareLetterWriting();
if (prefersReducedMotion) {
  letterSection.classList.add("is-in-view");
} else if (!("IntersectionObserver" in window)) {
  letterSection.classList.add("is-in-view");
  setLetterButterflyActive(true);
} else {
  const letterAtmosphereObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      letterSection.classList.toggle("is-in-view", entry.isIntersecting);
      setLetterButterflyActive(entry.isIntersecting && !document.hidden);
    });
  }, { threshold: .06, rootMargin: "12% 0px" });
  letterAtmosphereObserver.observe(letterSection);
}
if ("ResizeObserver" in window) {
  const letterButterflyResizeObserver = new ResizeObserver(resizeLetterButterflyCanvas);
  letterButterflyResizeObserver.observe(letterSection);
} else {
  window.addEventListener("resize", resizeLetterButterflyCanvas);
}
document.addEventListener("visibilitychange", () => {
  setLetterButterflyActive(!document.hidden && letterSection.classList.contains("is-in-view"));
});
letterRevealAll.addEventListener("click", () => finishLetterWriting(true));
window.addEventListener("pointerdown", stopLetterAutoFollow, { passive: true });
window.addEventListener("wheel", stopLetterAutoFollow, { passive: true });
window.addEventListener("touchstart", stopLetterAutoFollow, { passive: true });
document.addEventListener("keydown", (event) => {
  if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(event.key)) stopLetterAutoFollow();
});

letterOpen.addEventListener("click", () => {
  if (letterOpening) return;
  letterOpening = true;
  letterSection.classList.add("is-open");
  setLetterButterflyActive(false);
  window.setTimeout(releaseLetterButterflyAtmosphere, prefersReducedMotion ? 20 : 1420);
  letterCover.classList.add("is-unsealing");
  createButterflyCluster(letterOpen, 8);
  playWishChime(4);
  window.setTimeout(() => {
    letterInside.hidden = false;
    letterInside.inert = true;
  }, prefersReducedMotion ? 0 : 980);
  window.setTimeout(() => {
    letterCover.hidden = true;
    letterInside.inert = false;
    letterInside.focus({ preventScroll: true });
    createButterflyCluster(letterInside, 10);
    letterInside.scrollIntoView({ behavior: "auto", block: "start" });
    window.setTimeout(startLetterWriting, prefersReducedMotion ? 0 : 300);
  }, prefersReducedMotion ? 10 : 1360);
});

const finaleSection = $("#finale");
const finaleWishButton = $("#finaleWishButton");

function awakenFinale(particleCount = 36) {
  finaleSection.classList.remove("is-celebrating");
  void finaleSection.offsetWidth;
  finaleSection.classList.add("is-celebrating");
  if (!prefersReducedMotion) burstFromElement($("#finaleVisual"), particleCount);
}

finaleWishButton.addEventListener("click", () => {
  stopFairytaleCelebration();
  finaleWishButton.classList.add("is-complete");
  $("#finaleWishText").textContent = "愿望已收好";
  finaleWishButton.querySelector("small").textContent = "願いを大切にしまった";
  finaleWishButton.setAttribute("aria-label", "生日愿望已收好，再次播放生日录音与庆祝特效");
  awakenFinale(54);
  runGrandCelebration(false);
  void playBirthdayRecording();
});

if ("IntersectionObserver" in window) {
  const finaleObserver = new IntersectionObserver((entries, observer) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    awakenFinale(28);
    observer.disconnect();
  }, { threshold: .38 });
  finaleObserver.observe(finaleSection);
} else {
  finaleSection.classList.add("is-celebrating");
}

const soundControl = $("#soundControl");
const soundLabel = $("#soundLabel");
const backgroundMusic = $("#backgroundMusic");
const birthdayRecording = $("#birthdayRecording");
const confessionSection = $("#confession");
const confessionVideo = $("#confessionVideo");
const confessionClosing = $(".confession-closing", confessionSection);
const confessionClosingTitle = $("p", confessionClosing);
const confessionButterflyCanvas = $("#confessionButterflyTrail");
const confessionButterflyField = $("#confessionButterflyField");
const confessionButterflyContext = confessionButterflyCanvas?.getContext("2d", { alpha: true });
let birthdayRecordingActive = false;
let confessionVideoActive = false;
let confessionSoundtrackWasPlaying = false;
let confessionSnapArmed = true;
let confessionButterflyActive = false;
let confessionButterflyFrame = 0;
let confessionButterflyLastFrame = 0;
let confessionButterflyStartedAt = 0;
let confessionButterflyWidth = 1;
let confessionButterflyHeight = 1;
let confessionButterflyDpr = 1;
let confessionButterflyHistory = [];
let confessionButterflyParticles = [];
let confessionButterflyLastEmission = 0;
let confessionButterflyOrbit = { centerX: 0, centerY: 0, radiusX: 1, radiusY: 1, size: 88 };
const confessionButterfly = {
  element: null,
  bankElement: null,
  leftWing: null,
  rightWing: null,
};
let birthdayAudioContext = null;
let birthdayAudioGraphReady = false;
let fireworkAudioBus = null;
let fireworkNoiseBuffer = null;
let fireworkAudioActive = false;
const backgroundMusicDefaultVolume = .46;
backgroundMusic.volume = backgroundMusicDefaultVolume;
birthdayRecording.volume = 1;

function getBirthdayAudioContext() {
  if (birthdayAudioContext) return birthdayAudioContext;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  try {
    birthdayAudioContext = new AudioContextClass();
    return birthdayAudioContext;
  } catch {
    birthdayAudioContext = null;
    return null;
  }
}

function enhanceBirthdayRecording() {
  if (birthdayAudioGraphReady) return birthdayAudioContext;

  const audioContext = getBirthdayAudioContext();
  if (!audioContext) return null;

  try {
    const source = audioContext.createMediaElementSource(birthdayRecording);
    const voiceHighpass = audioContext.createBiquadFilter();
    const voicePresence = audioContext.createBiquadFilter();
    const voiceAir = audioContext.createBiquadFilter();
    const voiceGain = audioContext.createGain();
    const voiceCompressor = audioContext.createDynamicsCompressor();

    // Cut rumble, bring speech presence forward, then level the louder peaks.
    voiceHighpass.type = "highpass";
    voiceHighpass.frequency.value = 90;
    voiceHighpass.Q.value = .7;
    voicePresence.type = "peaking";
    voicePresence.frequency.value = 1800;
    voicePresence.Q.value = .9;
    voicePresence.gain.value = 4.5;
    voiceAir.type = "highshelf";
    voiceAir.frequency.value = 4200;
    voiceAir.gain.value = 2.5;
    voiceGain.gain.value = 1.9;
    voiceCompressor.threshold.value = -27;
    voiceCompressor.knee.value = 18;
    voiceCompressor.ratio.value = 4.2;
    voiceCompressor.attack.value = .004;
    voiceCompressor.release.value = .16;

    source
      .connect(voiceHighpass)
      .connect(voicePresence)
      .connect(voiceAir)
      .connect(voiceGain)
      .connect(voiceCompressor)
      .connect(audioContext.destination);
    birthdayAudioGraphReady = true;
    return audioContext;
  } catch {
    // Keep the recording playable at its native volume if Web Audio is unavailable.
    birthdayAudioContext = null;
    birthdayAudioGraphReady = false;
    return null;
  }
}

function getFireworkAudioBus(audioContext) {
  if (fireworkAudioBus?.context === audioContext) return fireworkAudioBus;
  fireworkAudioBus = audioContext.createGain();
  fireworkAudioBus.gain.value = .0001;
  fireworkAudioBus.connect(audioContext.destination);
  return fireworkAudioBus;
}

function getFireworkNoiseBuffer(audioContext) {
  if (fireworkNoiseBuffer?.sampleRate === audioContext.sampleRate) return fireworkNoiseBuffer;
  const frameCount = Math.round(audioContext.sampleRate * 1.1);
  fireworkNoiseBuffer = audioContext.createBuffer(1, frameCount, audioContext.sampleRate);
  const data = fireworkNoiseBuffer.getChannelData(0);
  for (let index = 0; index < frameCount; index += 1) {
    const fade = 1 - index / frameCount;
    data[index] = (Math.random() * 2 - 1) * fade;
  }
  return fireworkNoiseBuffer;
}

function startFireworkAudio() {
  const audioContext = getBirthdayAudioContext();
  if (!audioContext) return;
  const bus = getFireworkAudioBus(audioContext);
  const now = audioContext.currentTime;
  fireworkAudioActive = true;
  bus.gain.cancelScheduledValues(now);
  bus.gain.setTargetAtTime(.34, now, .08);
  backgroundMusic.volume = .16;
  if (audioContext.state === "suspended") void audioContext.resume();
}

function stopFireworkAudio() {
  const audioContext = birthdayAudioContext;
  fireworkAudioActive = false;
  backgroundMusic.volume = backgroundMusicDefaultVolume;
  if (!audioContext || !fireworkAudioBus) return;
  const now = audioContext.currentTime;
  fireworkAudioBus.gain.cancelScheduledValues(now);
  fireworkAudioBus.gain.setTargetAtTime(.0001, now, .08);
}

function playFireworkLaunchSound() {
  if (!fireworkAudioActive) return;
  const audioContext = getBirthdayAudioContext();
  if (!audioContext) return;
  const bus = getFireworkAudioBus(audioContext);
  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(230, now);
  oscillator.frequency.exponentialRampToValueAtTime(980, now + .42);
  gain.gain.setValueAtTime(.0001, now);
  gain.gain.exponentialRampToValueAtTime(.13, now + .07);
  gain.gain.exponentialRampToValueAtTime(.0001, now + .58);
  oscillator.connect(gain).connect(bus);
  oscillator.start(now);
  oscillator.stop(now + .62);
}

function playFireworkBurstSound() {
  if (!fireworkAudioActive) return;
  const audioContext = getBirthdayAudioContext();
  if (!audioContext) return;
  const bus = getFireworkAudioBus(audioContext);
  const now = audioContext.currentTime;
  const noiseBuffer = getFireworkNoiseBuffer(audioContext);

  const boomSource = audioContext.createBufferSource();
  const boomFilter = audioContext.createBiquadFilter();
  const boomGain = audioContext.createGain();
  boomSource.buffer = noiseBuffer;
  boomFilter.type = "lowpass";
  boomFilter.frequency.setValueAtTime(2400, now);
  boomFilter.frequency.exponentialRampToValueAtTime(180, now + .62);
  boomGain.gain.setValueAtTime(.0001, now);
  boomGain.gain.exponentialRampToValueAtTime(.44, now + .018);
  boomGain.gain.exponentialRampToValueAtTime(.0001, now + .7);
  boomSource.connect(boomFilter).connect(boomGain).connect(bus);
  boomSource.start(now);
  boomSource.stop(now + .74);

  const thump = audioContext.createOscillator();
  const thumpGain = audioContext.createGain();
  thump.type = "sine";
  thump.frequency.setValueAtTime(120, now);
  thump.frequency.exponentialRampToValueAtTime(43, now + .42);
  thumpGain.gain.setValueAtTime(.0001, now);
  thumpGain.gain.exponentialRampToValueAtTime(.3, now + .012);
  thumpGain.gain.exponentialRampToValueAtTime(.0001, now + .48);
  thump.connect(thumpGain).connect(bus);
  thump.start(now);
  thump.stop(now + .52);

  const sparkleSource = audioContext.createBufferSource();
  const sparkleFilter = audioContext.createBiquadFilter();
  const sparkleGain = audioContext.createGain();
  sparkleSource.buffer = noiseBuffer;
  sparkleFilter.type = "highpass";
  sparkleFilter.frequency.value = 2300;
  sparkleGain.gain.setValueAtTime(.0001, now + .03);
  sparkleGain.gain.exponentialRampToValueAtTime(.16, now + .1);
  sparkleGain.gain.exponentialRampToValueAtTime(.0001, now + .72);
  sparkleSource.connect(sparkleFilter).connect(sparkleGain).connect(bus);
  sparkleSource.start(now + .03);
  sparkleSource.stop(now + .76);
}

function playWishChime(index = 0) {
  const audioContext = getBirthdayAudioContext();
  if (!audioContext) return;
  if (audioContext.state === "suspended") void audioContext.resume();
  const notes = [523.25, 659.25, 783.99, 987.77, 1046.5];
  const frequency = notes[index % notes.length];
  const now = audioContext.currentTime;
  [1, 2.01].forEach((ratio, toneIndex) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = toneIndex === 0 ? "sine" : "triangle";
    oscillator.frequency.value = frequency * ratio;
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(toneIndex === 0 ? .055 : .018, now + .025);
    gain.gain.exponentialRampToValueAtTime(.0001, now + .72 + toneIndex * .12);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + .9);
  });
}

function updateSoundState(isPlaying) {
  soundControl.classList.toggle("is-playing", isPlaying);
  if (confessionVideoActive) {
    soundLabel.textContent = isPlaying ? "暂停视频" : confessionVideo.ended ? "重播视频" : "继续视频";
    soundControl.setAttribute("aria-label", isPlaying ? "暂停告白视频" : confessionVideo.ended ? "重播告白视频" : "继续播放告白视频");
    return;
  }
  if (birthdayRecordingActive) {
    soundLabel.textContent = isPlaying ? "暂停录音" : "继续录音";
    soundControl.setAttribute("aria-label", isPlaying ? "暂停生日录音" : "继续播放生日录音");
    return;
  }
  soundLabel.textContent = isPlaying ? "暂停音乐" : "播放音乐";
  soundControl.setAttribute("aria-label", isPlaying ? "暂停背景音乐" : "播放背景音乐");
}

async function startBackgroundMusic() {
  try {
    await backgroundMusic.play();
    updateSoundState(true);
    return true;
  } catch {
    updateSoundState(false);
    return false;
  }
}

function activeSoundtrack() {
  if (confessionVideoActive) return confessionVideo;
  return birthdayRecordingActive ? birthdayRecording : backgroundMusic;
}

async function startActiveSoundtrack() {
  const soundtrack = activeSoundtrack();
  try {
    await soundtrack.play();
    updateSoundState(true);
  } catch {
    updateSoundState(false);
  }
}

function finishBirthdayRecording() {
  if (!birthdayRecordingActive) return;
  birthdayRecordingActive = false;
  birthdayRecording.currentTime = 0;
  updateSoundState(false);
  if (!confessionVideoActive) void startBackgroundMusic();
}

async function playBirthdayRecording() {
  if (birthdayRecordingActive) return;
  birthdayRecordingActive = true;
  backgroundMusic.pause();
  birthdayRecording.currentTime = 0;
  updateSoundState(false);
  try {
    const audioContext = enhanceBirthdayRecording();
    if (audioContext?.state === "suspended") await audioContext.resume();
    await birthdayRecording.play();
    updateSoundState(true);
  } catch {
    finishBirthdayRecording();
  }
}

soundControl.addEventListener("click", async () => {
  const soundtrack = activeSoundtrack();
  if (soundtrack.paused) {
    if (soundtrack === confessionVideo && confessionVideo.ended) {
      confessionVideo.currentTime = 0;
      restartConfessionVisuals();
    }
    await startActiveSoundtrack();
  }
  else {
    soundtrack.pause();
    updateSoundState(false);
  }
});

backgroundMusic.addEventListener("play", () => {
  if (!birthdayRecordingActive && !confessionVideoActive) updateSoundState(true);
});
backgroundMusic.addEventListener("pause", () => {
  if (!birthdayRecordingActive && !confessionVideoActive) updateSoundState(false);
});
birthdayRecording.addEventListener("play", () => {
  if (birthdayRecordingActive && !confessionVideoActive) updateSoundState(true);
});
birthdayRecording.addEventListener("pause", () => {
  if (birthdayRecordingActive && !birthdayRecording.ended && !confessionVideoActive) updateSoundState(false);
});
birthdayRecording.addEventListener("ended", finishBirthdayRecording);
birthdayRecording.addEventListener("error", finishBirthdayRecording);

function createConfessionButterfly() {
  if (!confessionButterflyField) return;
  const element = document.createElement("div");
  element.className = "letter-butterfly confession-butterfly";
  element.innerHTML = `<div class="letter-butterfly__bank"><div class="letter-butterfly__visual">
    <div class="letter-butterfly__wing letter-butterfly__wing--left">${letterButterflyWingSvg("confession", "left")}</div>
    <div class="letter-butterfly__wing letter-butterfly__wing--right">${letterButterflyWingSvg("confession", "right")}</div>
    <div class="letter-butterfly__body">${letterButterflyBodySvg("confession")}</div>
  </div></div>`;
  confessionButterfly.element = element;
  confessionButterfly.bankElement = element.querySelector(".letter-butterfly__bank");
  confessionButterfly.leftWing = element.querySelector(".letter-butterfly__wing--left");
  confessionButterfly.rightWing = element.querySelector(".letter-butterfly__wing--right");
  confessionButterflyField.replaceChildren(element);
}

function updateConfessionButterflyOrbit() {
  if (!confessionClosingTitle || !confessionButterfly.element) return;
  const mobile = confessionButterflyWidth < 640;
  const size = mobile ? 58 : 92;
  const titleWidth = confessionClosingTitle.offsetWidth;
  const titleHeight = confessionClosingTitle.offsetHeight;
  const maxRadiusX = Math.max(1, confessionButterflyWidth * .5 - size * .55);
  confessionButterflyOrbit = {
    centerX: confessionClosingTitle.offsetLeft + titleWidth * .5,
    centerY: confessionClosingTitle.offsetTop + titleHeight * .5 - (mobile ? 9 : 17),
    radiusX: Math.min(maxRadiusX, titleWidth * .63 + size * .85),
    radiusY: Math.min(
      confessionButterflyHeight * .22,
      Math.max(mobile ? 86 : 142, titleHeight * .95 + size * .32),
    ),
    size,
  };
  confessionButterfly.element.style.setProperty("--butterfly-size", `${size}px`);
}

function resizeConfessionButterflyCanvas() {
  if (!confessionButterflyContext || !confessionButterflyCanvas) return;
  const width = confessionButterflyCanvas.clientWidth;
  const height = confessionButterflyCanvas.clientHeight;
  if (!width || !height) return;
  confessionButterflyWidth = width;
  confessionButterflyHeight = height;
  confessionButterflyDpr = Math.min(window.devicePixelRatio || 1, width < 640 ? 1.5 : 2);
  confessionButterflyCanvas.width = Math.max(1, Math.round(width * confessionButterflyDpr));
  confessionButterflyCanvas.height = Math.max(1, Math.round(height * confessionButterflyDpr));
  confessionButterflyContext.setTransform(confessionButterflyDpr, 0, 0, confessionButterflyDpr, 0, 0);
  confessionButterflyHistory = [];
  confessionButterflyParticles = [];
  updateConfessionButterflyOrbit();
}

function confessionButterflyPoint(angle) {
  const { centerX, centerY, radiusX, radiusY } = confessionButterflyOrbit;
  const ripple = 1 + Math.sin(angle * 3 + .45) * .035 + Math.sin(angle * 5 - .8) * .018;
  return {
    x: centerX + Math.cos(angle) * radiusX * ripple + Math.sin(angle * 2) * radiusX * .026,
    y: centerY + Math.sin(angle) * radiusY * (.92 + Math.cos(angle * 2) * .055)
      + Math.cos(angle * 2 - .4) * radiusY * .055,
  };
}

function confessionButterflyPose(now) {
  const duration = confessionButterflyWidth < 640 ? 8.2 : 9.4;
  const progress = ((now - confessionButterflyStartedAt) / 1000 / duration + .61) % 1;
  const angle = progress * Math.PI * 2;
  const step = .012;
  const point = confessionButterflyPoint(angle);
  const before = confessionButterflyPoint(angle - step);
  const after = confessionButterflyPoint(angle + step);
  return {
    ...point,
    angle: Math.atan2(after.y - before.y, after.x - before.x),
    orbitAngle: angle,
  };
}

function drawConfessionButterflyTrail() {
  const context = confessionButterflyContext;
  const history = confessionButterflyHistory;
  if (history.length < 2) return;
  const first = history[0];
  const last = history[history.length - 1];
  context.save();
  context.globalCompositeOperation = "lighter";
  context.lineCap = "round";
  context.lineJoin = "round";

  const layers = [
    { width: 12, alpha: .1, blur: 21 },
    { width: 5.2, alpha: .22, blur: 12 },
    { width: 1.35, alpha: .82, blur: 5 },
  ];
  layers.forEach((layer) => {
    const gradient = context.createLinearGradient(first.x, first.y, last.x, last.y);
    gradient.addColorStop(0, "rgba(8,38,178,0)");
    gradient.addColorStop(.38, `rgba(10,76,225,${layer.alpha * .28})`);
    gradient.addColorStop(.74, `rgba(22,158,255,${layer.alpha * .72})`);
    gradient.addColorStop(1, `rgba(91,231,255,${layer.alpha})`);
    context.strokeStyle = gradient;
    context.lineWidth = layer.width;
    context.shadowColor = `rgba(21,151,255,${layer.alpha * .9})`;
    context.shadowBlur = layer.blur;
    context.beginPath();
    context.moveTo(first.x, first.y);
    for (let index = 1; index < history.length - 1; index += 1) {
      const current = history[index];
      const next = history[index + 1];
      context.quadraticCurveTo(current.x, current.y, (current.x + next.x) * .5, (current.y + next.y) * .5);
    }
    context.lineTo(last.x, last.y);
    context.stroke();
  });
  context.restore();
}

function emitConfessionButterflyParticles(pose, now) {
  if (now - confessionButterflyLastEmission < (confessionButterflyWidth < 640 ? 38 : 26)) return;
  confessionButterflyLastEmission = now;
  const { size } = confessionButterflyOrbit;
  const count = confessionButterflyWidth < 640 ? 1 : (Math.random() > .64 ? 2 : 1);
  const tailX = pose.x - Math.cos(pose.angle) * size * .2;
  const tailY = pose.y - Math.sin(pose.angle) * size * .2;
  for (let index = 0; index < count; index += 1) {
    const normal = (Math.random() - .5) * size * .2;
    const life = .72 + Math.random() * 1.15;
    const speed = 9 + Math.random() * 24;
    confessionButterflyParticles.push({
      x: tailX + Math.sin(pose.angle) * normal,
      y: tailY - Math.cos(pose.angle) * normal,
      vx: -Math.cos(pose.angle) * speed + (Math.random() - .5) * 11,
      vy: -Math.sin(pose.angle) * speed - 3 - Math.random() * 8,
      life,
      maxLife: life,
      size: .55 + Math.random() * 1.45,
      tone: Math.random(),
      glint: Math.random() > .88,
    });
  }
  const limit = confessionButterflyWidth < 640 ? 92 : 170;
  if (confessionButterflyParticles.length > limit) {
    confessionButterflyParticles.splice(0, confessionButterflyParticles.length - limit);
  }
}

function drawConfessionButterflyParticles(delta) {
  const context = confessionButterflyContext;
  context.save();
  context.globalCompositeOperation = "lighter";
  confessionButterflyParticles.forEach((particle) => {
    particle.life -= delta;
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.vx *= Math.pow(.975, delta * 60);
    particle.vy -= 2.2 * delta;
    const remaining = Math.max(0, particle.life / particle.maxLife);
    const alpha = Math.pow(remaining, 1.3) * (.24 + particle.tone * .48);
    const red = Math.round(23 + particle.tone * 72);
    const green = Math.round(104 + particle.tone * 126);
    context.fillStyle = `rgba(${red},${green},255,${alpha})`;
    context.shadowColor = `rgba(23,143,255,${alpha})`;
    context.shadowBlur = 5 + particle.size * 5;
    if (particle.glint) {
      context.fillRect(particle.x - particle.size * 2.2, particle.y - .35, particle.size * 4.4, .7);
      context.fillRect(particle.x - .35, particle.y - particle.size * 2.2, .7, particle.size * 4.4);
    } else {
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      context.fill();
    }
  });
  context.restore();
  confessionButterflyParticles = confessionButterflyParticles.filter((particle) => particle.life > 0);
}

function placeConfessionButterfly(pose, now) {
  const { element, bankElement } = confessionButterfly;
  if (!element || !bankElement) return;
  const { size } = confessionButterflyOrbit;
  const elapsed = (now - confessionButterflyStartedAt) / 1000;
  const behavior = (elapsed + .35) % 3.15;
  const flap = behavior < 1.08
    ? .16 + .84 * Math.pow((1 - Math.cos(behavior * Math.PI * 9.2)) * .5, .65)
    : .91 + Math.sin(elapsed * 1.45) * .04;
  const fold = 7 + (1 - flap) * 66;
  const depth = (Math.sin(pose.orbitAngle) + 1) * .5;
  const scale = .86 + depth * .18;
  const heading = pose.angle * 180 / Math.PI + 90;
  const bank = Math.sin(pose.orbitAngle) * 10 + Math.sin(pose.orbitAngle * 2) * 4;
  element.style.opacity = Math.min(.96, Math.max(0, elapsed * 1.4)).toFixed(3);
  element.style.transform = `translate3d(${(pose.x - size * .5).toFixed(2)}px, ${(pose.y - size * .375).toFixed(2)}px, ${(depth * 28).toFixed(2)}px) rotateZ(${heading.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
  element.style.setProperty("--wing-fold", `${fold.toFixed(2)}deg`);
  element.style.setProperty("--wing-fold-right", `${(-fold).toFixed(2)}deg`);
  element.style.setProperty("--pitch", `${(-5 + depth * 9).toFixed(2)}deg`);
  bankElement.style.transform = `rotateY(${bank.toFixed(2)}deg) rotateZ(${(bank * .22).toFixed(2)}deg)`;
}

function animateConfessionButterfly(now) {
  if (!confessionButterflyActive || !confessionButterflyContext || document.hidden) {
    confessionButterflyFrame = 0;
    return;
  }
  const delta = Math.min(.05, Math.max(.001, (now - confessionButterflyLastFrame) / 1000 || .0167));
  confessionButterflyLastFrame = now;
  const pose = confessionButterflyPose(now);
  const { size } = confessionButterflyOrbit;
  const tail = {
    x: pose.x - Math.cos(pose.angle) * size * .18,
    y: pose.y - Math.sin(pose.angle) * size * .18,
  };
  confessionButterflyHistory.push(tail);
  const historyLimit = confessionButterflyWidth < 640 ? 42 : 66;
  if (confessionButterflyHistory.length > historyLimit) confessionButterflyHistory.shift();

  confessionButterflyContext.clearRect(0, 0, confessionButterflyWidth, confessionButterflyHeight);
  drawConfessionButterflyTrail();
  emitConfessionButterflyParticles(pose, now);
  drawConfessionButterflyParticles(delta);
  placeConfessionButterfly(pose, now);
  confessionButterflyFrame = window.requestAnimationFrame(animateConfessionButterfly);
}

function placeStaticConfessionButterfly() {
  if (!confessionButterfly.element || !confessionButterfly.bankElement) return;
  updateConfessionButterflyOrbit();
  const pose = confessionButterflyPoint(-.72);
  const { size } = confessionButterflyOrbit;
  confessionButterfly.element.style.opacity = ".9";
  confessionButterfly.element.style.transform = `translate3d(${(pose.x - size * .5).toFixed(2)}px, ${(pose.y - size * .375).toFixed(2)}px, 0) rotateZ(122deg) scale(.94)`;
  confessionButterfly.element.style.setProperty("--wing-fold", "19deg");
  confessionButterfly.element.style.setProperty("--wing-fold-right", "-19deg");
  confessionButterfly.bankElement.style.transform = "rotateY(-6deg)";
}

function setConfessionButterflyActive(active) {
  const shouldShow = Boolean(active && confessionButterflyContext && confessionButterfly.element);
  confessionButterflyActive = shouldShow && !prefersReducedMotion;
  if (!shouldShow) {
    if (confessionButterflyFrame) window.cancelAnimationFrame(confessionButterflyFrame);
    confessionButterflyFrame = 0;
    confessionButterflyHistory = [];
    confessionButterflyParticles = [];
    confessionButterflyContext?.clearRect(0, 0, confessionButterflyWidth, confessionButterflyHeight);
    if (confessionButterfly.element) confessionButterfly.element.style.opacity = "0";
    return;
  }

  resizeConfessionButterflyCanvas();
  if (prefersReducedMotion) {
    placeStaticConfessionButterfly();
    return;
  }
  if (!confessionButterflyFrame) {
    confessionButterflyStartedAt = performance.now();
    confessionButterflyLastFrame = confessionButterflyStartedAt;
    confessionButterflyLastEmission = 0;
    confessionButterflyFrame = window.requestAnimationFrame(animateConfessionButterfly);
  }
}

createConfessionButterfly();
if ("ResizeObserver" in window && confessionClosing) {
  const confessionButterflyResizeObserver = new ResizeObserver(() => {
    if (!confessionButterflyActive && !prefersReducedMotion) return;
    resizeConfessionButterflyCanvas();
    if (prefersReducedMotion && confessionSection.classList.contains("is-video-ended")) {
      placeStaticConfessionButterfly();
    }
  });
  confessionButterflyResizeObserver.observe(confessionClosing);
} else {
  window.addEventListener("resize", resizeConfessionButterflyCanvas);
}
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && confessionSection.classList.contains("is-video-ended")) {
    setConfessionButterflyActive(true);
  }
});

function restartConfessionVisuals() {
  setConfessionButterflyActive(false);
  confessionSection.classList.remove("is-video-active", "is-video-ended", "is-video-paused");
  void confessionSection.offsetWidth;
  confessionSection.classList.add("is-video-active");
}

async function startConfessionVideo() {
  if (confessionVideoActive) return;
  const soundtrack = activeSoundtrack();
  confessionSoundtrackWasPlaying = !soundtrack.paused;
  confessionVideoActive = true;
  soundtrack.pause();
  confessionVideo.currentTime = 0;
  confessionVideo.muted = false;
  confessionVideo.volume = .88;
  restartConfessionVisuals();

  try {
    await confessionVideo.play();
    updateSoundState(true);
  } catch {
    confessionSection.classList.add("is-video-paused");
    updateSoundState(false);
  }
}

function stopConfessionVideo({ restoreSoundtrack = true } = {}) {
  if (!confessionVideoActive) return;
  confessionVideoActive = false;
  setConfessionButterflyActive(false);
  confessionSection.classList.remove("is-video-active", "is-video-ended", "is-video-paused");
  confessionVideo.pause();
  confessionVideo.currentTime = 0;
  updateSoundState(false);
  if (restoreSoundtrack && confessionSoundtrackWasPlaying) void startActiveSoundtrack();
  confessionSoundtrackWasPlaying = false;
}

confessionVideo.addEventListener("play", () => {
  if (!confessionVideoActive) return;
  if (confessionSection.classList.contains("is-video-ended") && confessionVideo.currentTime < .35) {
    restartConfessionVisuals();
  } else {
    confessionSection.classList.remove("is-video-paused");
  }
  updateSoundState(true);
});
confessionVideo.addEventListener("pause", () => {
  if (confessionVideoActive && !confessionVideo.ended) {
    confessionSection.classList.add("is-video-paused");
    updateSoundState(false);
  }
});
confessionVideo.addEventListener("ended", () => {
  if (!confessionVideoActive) return;
  confessionSection.classList.remove("is-video-paused");
  confessionSection.classList.add("is-video-ended");
  setConfessionButterflyActive(true);
  updateSoundState(false);
});

function alignConfessionViewport() {
  if (
    !confessionSnapArmed
    || document.body.classList.contains("ceremony-pending")
    || document.body.classList.contains("ceremony-opening")
  ) return;
  confessionSnapArmed = false;
  const distanceFromTop = confessionSection.getBoundingClientRect().top;
  if (Math.abs(distanceFromTop) < 2) return;
  confessionSection.scrollIntoView({
    behavior: prefersReducedMotion ? "auto" : "smooth",
    block: "start",
  });
}

if ("IntersectionObserver" in window) {
  const confessionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.intersectionRatio >= .28) alignConfessionViewport();
      if (entry.intersectionRatio >= .42) void startConfessionVideo();
      else if (entry.intersectionRatio <= .14) {
        confessionSnapArmed = true;
        stopConfessionVideo();
      }
    });
  }, { threshold: [0, .14, .28, .42, .7] });
  confessionObserver.observe(confessionSection);
}
void startBackgroundMusic();

const openingCeremony = $("#openingCeremony");
const enterCeremony = $("#enterCeremony");
const ceremonyBackground = $$("body > .reading-progress, body > .site-header, body > main, body > .site-footer, body > .lightbox");
let ceremonyOpened = false;
ceremonyBackground.forEach((element) => { element.inert = true; });

async function openCeremony() {
  if (ceremonyOpened) return;
  ceremonyOpened = true;
  enterCeremony.disabled = true;

  await startActiveSoundtrack();
  document.body.classList.add("ceremony-opening");
  openingCeremony.classList.add("is-opening");
  burstFromElement(enterCeremony, prefersReducedMotion ? 0 : 42);

  if (!prefersReducedMotion) {
    window.setTimeout(() => runGrandCelebration(true), 410);
  }

  window.setTimeout(() => {
    openingCeremony.hidden = true;
    openingCeremony.setAttribute("aria-hidden", "true");
    document.body.classList.remove("ceremony-pending", "ceremony-opening");
    ceremonyBackground.forEach((element) => { element.inert = false; });
    window.scrollTo({ top: 0, behavior: "auto" });
    soundControl.focus({ preventScroll: true });
  }, prefersReducedMotion ? 80 : 1380);
}

enterCeremony.addEventListener("click", openCeremony);
window.requestAnimationFrame(() => enterCeremony.focus({ preventScroll: true }));

function updateReadingProgress() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  $("#readingProgress").style.width = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`;
}

function updateHeaderTheme() {
  const checkpoint = window.scrollY + 48;
  const darkSections = [$("#cover"), $("#pageTurn"), $("#confession"), $("#future"), $("#finale")];
  const isDark = darkSections.some((section) => checkpoint >= section.offsetTop && checkpoint < section.offsetTop + section.offsetHeight);
  $(".site-header").classList.toggle("on-dark", isDark);
  $("#chapterCompass").classList.toggle("on-dark", isDark);
}

const chapterCompass = $("#chapterCompass");
const chapterCompassIndex = $("#chapterCompassIndex");
const chapterCompassLabel = $("#chapterCompassLabel");
const chapterCompassJapanese = $("#chapterCompassJapanese");
const chapterDefinitions = [
  { id: "cover", index: "00", label: "封面", japanese: "はじまり" },
  { id: "birthdayOpening", index: "00", label: "生日", japanese: "誕生日" },
  { id: "favorites", index: "01", label: "喜欢", japanese: "好き" },
  { id: "pageTurn", index: "01.5", label: "转页", japanese: "次の頁" },
  { id: "her", index: "02", label: "她", japanese: "彼女" },
  { id: "conversations", index: "03", label: "我们说过", japanese: "ことば" },
  { id: "confession", index: "04", label: "想说", japanese: "本音" },
  { id: "future", index: "05", label: "未来", japanese: "これから" },
  { id: "letter", index: "06", label: "信件", japanese: "手紙" },
  { id: "finale", index: "07", label: "生日终章", japanese: "誕生日" },
].map((chapter) => ({ ...chapter, element: $(`#${chapter.id}`) }));
let currentChapterId = "";

function updateChapterExperience() {
  const checkpoint = window.scrollY + window.innerHeight * .36;
  let activeChapter = chapterDefinitions[0];
  chapterDefinitions.forEach((chapter) => {
    if (checkpoint >= chapter.element.offsetTop) activeChapter = chapter;
  });
  const localProgress = Math.max(0, Math.min(1, (checkpoint - activeChapter.element.offsetTop) / Math.max(1, activeChapter.element.offsetHeight)));
  chapterCompass.style.setProperty("--chapter-fill", `${(localProgress * 100).toFixed(1)}%`);
  chapterCompass.dataset.chapter = activeChapter.id;

  if (currentChapterId === activeChapter.id) return;
  currentChapterId = activeChapter.id;
  chapterCompassIndex.textContent = activeChapter.index;
  chapterCompassLabel.textContent = activeChapter.label;
  chapterCompassJapanese.textContent = activeChapter.japanese;
  chapterCompass.classList.remove("is-changing");
  void chapterCompass.offsetWidth;
  chapterCompass.classList.add("is-changing");
  $$(".section-nav a").forEach((link) => {
    link.classList.toggle("is-current", link.getAttribute("href") === `#${activeChapter.id}`);
  });
}

const sceneSections = $$(".birthday-opening, .favorite-page, .page-turn, .portrait-page, .conversations, .confession, .future, .letter, .birthday-finale");
sceneSections.forEach((section) => section.classList.add("scene-reactive"));
let spatialMotionFrame = 0;

function updateSpatialMotion() {
  spatialMotionFrame = 0;
  updateChapterExperience();
  if (prefersReducedMotion) return;
  sceneSections.forEach((section) => {
    const rect = section.getBoundingClientRect();
    const progress = (window.innerHeight - rect.top) / Math.max(1, window.innerHeight + rect.height);
    const shift = Math.max(-48, Math.min(48, (.5 - progress) * 72));
    section.style.setProperty("--scene-shift", `${shift.toFixed(1)}px`);
    section.classList.toggle("is-scene-active", rect.top < window.innerHeight * .7 && rect.bottom > window.innerHeight * .28);
  });
}

function scheduleSpatialMotion() {
  if (spatialMotionFrame) return;
  spatialMotionFrame = window.requestAnimationFrame(updateSpatialMotion);
}

const favoriteUniverse = $("#favoriteUniverse");
const characterCards = $$(".character-card");
let characterParallaxFrame = 0;

function updateCharacterParallax() {
  characterParallaxFrame = 0;
  if (prefersReducedMotion || !favoriteUniverse) return;
  const rect = favoriteUniverse.getBoundingClientRect();
  if (rect.bottom < 0 || rect.top > window.innerHeight) return;
  const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height) - .5;
  characterCards.forEach((card) => {
    const speed = Number(card.dataset.parallaxSpeed || 0);
    card.style.setProperty("--parallax-y", `${(progress * speed).toFixed(1)}px`);
  });
}

function scheduleCharacterParallax() {
  if (characterParallaxFrame || prefersReducedMotion) return;
  characterParallaxFrame = window.requestAnimationFrame(updateCharacterParallax);
}

window.addEventListener("scroll", () => {
  updateReadingProgress();
  updateHeaderTheme();
  scheduleCharacterParallax();
  scheduleSpatialMotion();
}, { passive: true });
window.addEventListener("resize", () => {
  updateReadingProgress();
  updateHeaderTheme();
  scheduleCharacterParallax();
  scheduleSpatialMotion();
});

function bindTilt(card) {
  if (!hasFinePointer || prefersReducedMotion || card.dataset.tiltBound === "true") return;
  card.dataset.tiltBound = "true";
  card.addEventListener("pointermove", (event) => {
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - .5;
    const y = (event.clientY - rect.top) / rect.height - .5;
    card.style.setProperty("--tilt-x", `${(-y * 3.2).toFixed(2)}deg`);
    card.style.setProperty("--tilt-y", `${(x * 3.2).toFixed(2)}deg`);
    card.style.setProperty("--pointer-x", `${((x + .5) * 100).toFixed(1)}%`);
    card.style.setProperty("--pointer-y", `${((y + .5) * 100).toFixed(1)}%`);
    card.classList.add("is-tilting");
  });
  card.addEventListener("pointerleave", () => {
    card.style.setProperty("--tilt-x", "0deg");
    card.style.setProperty("--tilt-y", "0deg");
    card.style.setProperty("--pointer-x", "50%");
    card.style.setProperty("--pointer-y", "50%");
    card.classList.remove("is-tilting");
  });
}

function bindMagneticControls() {
  if (!hasFinePointer || prefersReducedMotion) return;
  const controls = $$(".ceremony-enter, .wish-button, .page-turn-button, .future-button, .letter-open, .finale-wish-button, .cover-cta");
  controls.forEach((control) => {
    control.classList.add("magnetic-control");
    control.addEventListener("pointermove", (event) => {
      const rect = control.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - .5;
      const y = (event.clientY - rect.top) / rect.height - .5;
      control.style.setProperty("--magnet-x", `${(x * 10).toFixed(1)}px`);
      control.style.setProperty("--magnet-y", `${(y * 8).toFixed(1)}px`);
    });
    control.addEventListener("pointerleave", () => {
      control.style.setProperty("--magnet-x", "0px");
      control.style.setProperty("--magnet-y", "0px");
    });
  });
}

const particleCanvas = $("#particleCanvas");
const particleContext = particleCanvas.getContext("2d");
const particlePalette = ["194,72,58", "35,76,88", "233,180,168", "243,239,231"];
const pointerPosition = { x: -1000, y: -1000 };
let particleWidth = window.innerWidth;
let particleHeight = window.innerHeight;
let particleDpr = 1;
let ambientParticles = [];
let burstParticles = [];
let lastParticleFrame = 0;

function makeAmbientParticle() {
  return {
    x: Math.random() * particleWidth,
    y: Math.random() * particleHeight,
    vx: (Math.random() - .5) * .12,
    vy: .08 + Math.random() * .22,
    size: .8 + Math.random() * 1.7,
    alpha: .12 + Math.random() * .3,
    phase: Math.random() * Math.PI * 2,
    color: particlePalette[Math.floor(Math.random() * particlePalette.length)],
  };
}

function resizeParticleCanvas() {
  particleWidth = window.innerWidth;
  particleHeight = window.innerHeight;
  particleDpr = Math.min(window.devicePixelRatio || 1, 2);
  particleCanvas.width = Math.round(particleWidth * particleDpr);
  particleCanvas.height = Math.round(particleHeight * particleDpr);
  particleContext.setTransform(particleDpr, 0, 0, particleDpr, 0, 0);
  const targetCount = Math.min(78, Math.max(32, Math.round(particleWidth / 19)));
  ambientParticles = Array.from({ length: targetCount }, makeAmbientParticle);
}

function drawParticle(particle, alpha) {
  particleContext.save();
  if (particle.trail) {
    const trailLength = particle.trailLength ?? 4.5;
    particleContext.beginPath();
    particleContext.moveTo(particle.x, particle.y);
    particleContext.lineTo(particle.x - particle.vx * trailLength, particle.y - particle.vy * trailLength);
    particleContext.strokeStyle = `rgba(${particle.color},${Math.max(0, alpha * .45)})`;
    particleContext.lineWidth = Math.max(.5, particle.size * .38);
    particleContext.stroke();
  }
  particleContext.translate(particle.x, particle.y);
  particleContext.rotate(particle.rotation ?? (particle.phase || 0) * .35);
  particleContext.fillStyle = `rgba(${particle.color},${Math.max(0, alpha)})`;
  const size = particle.size;
  if (particle.shape === "butterfly") {
    const flap = .48 + Math.abs(Math.sin((particle.phase || 0) * 1.8)) * .72;
    particleContext.beginPath();
    particleContext.ellipse(-size * .62, 0, size * flap, size * .68, -.38, 0, Math.PI * 2);
    particleContext.ellipse(size * .62, 0, size * flap, size * .68, .38, 0, Math.PI * 2);
    particleContext.fill();
    particleContext.fillRect(-size * .1, -size * .55, size * .2, size * 1.1);
  } else if (particle.shape === "glow") {
    particleContext.shadowColor = `rgba(${particle.color},${Math.max(0, alpha * .9)})`;
    particleContext.shadowBlur = size * 7;
    particleContext.beginPath();
    particleContext.arc(0, 0, size, 0, Math.PI * 2);
    particleContext.fill();
  } else if (particle.shape === "confetti") {
    particleContext.fillRect(-size * 1.8, -size * .45, size * 3.6, size * .9);
  } else if (particle.shape === "petal") {
    particleContext.beginPath();
    particleContext.ellipse(0, 0, size * 1.7, size * .72, 0, 0, Math.PI * 2);
    particleContext.fill();
  } else {
    particleContext.beginPath();
    particleContext.moveTo(0, -size * 2.1);
    particleContext.lineTo(size * .75, 0);
    particleContext.lineTo(0, size * 2.1);
    particleContext.lineTo(-size * .75, 0);
    particleContext.closePath();
    particleContext.fill();
  }
  particleContext.restore();
}

function createBirthdayBurst(x, y, count = 24) {
  if (prefersReducedMotion) return;
  const amount = Math.min(count, 80);
  for (let index = 0; index < amount; index += 1) {
    const angle = (Math.PI * 2 * index) / amount + Math.random() * .22;
    const speed = 1 + Math.random() * 3.1;
    burstParticles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - .35,
      size: 1 + Math.random() * 2.4,
      alpha: .85,
      life: 1,
      decay: .018,
      phase: Math.random() * Math.PI * 2,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - .5) * .18,
      shape: "star",
      color: particlePalette[index % particlePalette.length],
    });
  }
}

function createButterflyTrail(x, y, count = 1) {
  if (prefersReducedMotion) return;
  const colors = ["218,244,249", "235,240,249", "178,219,232"];
  const amount = Math.min(count, 10);
  for (let index = 0; index < amount; index += 1) {
    burstParticles.push({
      x: x + (Math.random() - .5) * 18,
      y: y + (Math.random() - .5) * 14,
      vx: (Math.random() - .5) * .72,
      vy: -.28 - Math.random() * .58,
      size: 1.1 + Math.random() * 1.3,
      alpha: .3 + Math.random() * .28,
      life: 1,
      decay: .012 + Math.random() * .008,
      drag: .99,
      gravity: -.004,
      phase: Math.random() * Math.PI * 2,
      rotation: (Math.random() - .5) * .8,
      spin: (Math.random() - .5) * .045,
      shape: "glow",
      color: colors[index % colors.length],
    });
  }
}

function createButterflyCluster(element, count = 6) {
  if (!element) return;
  const rect = element.getBoundingClientRect();
  createButterflyTrail(rect.left + rect.width / 2, rect.top + rect.height / 2, count);
}

function createFirework(x, y, count = 58, colorOffset = 0) {
  if (prefersReducedMotion) return;
  const amount = Math.min(count, 90);
  for (let index = 0; index < amount; index += 1) {
    const angle = (Math.PI * 2 * index) / amount + Math.random() * .08;
    const speed = 2.2 + Math.random() * 4.8;
    burstParticles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: .9 + Math.random() * 1.9,
      alpha: .95,
      life: 1,
      decay: .008 + Math.random() * .004,
      drag: .978,
      gravity: .012,
      rotation: angle,
      spin: .035,
      trail: true,
      shape: "star",
      color: particlePalette[(index + colorOffset) % particlePalette.length],
    });
  }
}

const fairytalePalette = ["255,204,88", "255,102,178", "91,190,255", "99,239,171", "190,116,255", "255,112,82", "82,231,236"];

function createFairytaleRocket(targetX, targetY, colorOffset = 0) {
  if (prefersReducedMotion) return;
  const startX = targetX + (Math.random() - .5) * Math.min(110, particleWidth * .14);
  const startY = particleHeight + 28;
  const steps = 48 + Math.random() * 14;
  burstParticles.push({
    x: startX,
    y: startY,
    vx: (targetX - startX) / steps,
    vy: (targetY - startY) / steps,
    size: 1.7 + Math.random() * .8,
    alpha: .98,
    life: 1,
    decay: .015,
    drag: .999,
    gravity: .004,
    rotation: 0,
    spin: 0,
    trail: true,
    trailLength: 8,
    shape: "glow",
    color: fairytalePalette[colorOffset % fairytalePalette.length],
  });
}

function createFairytaleFirework(x, y, count = 96, colorOffset = 0) {
  if (prefersReducedMotion) return;
  const amount = Math.min(count, 124);
  const palette = fairytalePalette;
  for (let index = 0; index < amount; index += 1) {
    const angle = (Math.PI * 2 * index) / amount + Math.random() * .1;
    const speed = 3.2 + Math.random() * 5.8;
    burstParticles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: .9 + Math.random() * 2.15,
      alpha: .94,
      life: 1,
      decay: .007 + Math.random() * .004,
      drag: .978,
      gravity: .022,
      rotation: angle,
      spin: .035,
      trail: true,
      trailLength: 9 + Math.random() * 3,
      shape: "star",
      color: palette[(index + colorOffset) % palette.length],
    });
  }
  burstParticles.push({
    x,
    y,
    vx: 0,
    vy: 0,
    size: 3 + Math.random() * 2,
    alpha: 1,
    life: 1,
    decay: .045,
    shape: "glow",
    color: palette[colorOffset % palette.length],
  });

  const glitterAmount = Math.round(amount * .2);
  for (let index = 0; index < glitterAmount; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = .7 + Math.random() * 2.4;
    burstParticles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - .25,
      size: .65 + Math.random() * 1.15,
      alpha: .82,
      life: 1,
      decay: .006 + Math.random() * .004,
      drag: .986,
      gravity: .009,
      rotation: angle,
      spin: .02,
      trail: false,
      shape: "glow",
      color: palette[(index * 2 + colorOffset) % palette.length],
    });
  }
}

function createConfettiRain(count = 100) {
  if (prefersReducedMotion) return;
  const amount = Math.min(count, 140);
  for (let index = 0; index < amount; index += 1) {
    burstParticles.push({
      x: Math.random() * particleWidth,
      y: -20 - Math.random() * particleHeight * .35,
      vx: (Math.random() - .5) * 1.4,
      vy: 1.1 + Math.random() * 2.8,
      size: 2.1 + Math.random() * 3.6,
      alpha: .82,
      life: 1.65,
      decay: .0045 + Math.random() * .002,
      drag: .995,
      gravity: .018,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - .5) * .16,
      shape: "confetti",
      color: particlePalette[index % particlePalette.length],
    });
  }
}

function createPetalWave(count = 48) {
  if (prefersReducedMotion) return;
  const amount = Math.min(count, 70);
  for (let index = 0; index < amount; index += 1) {
    const fromLeft = index % 2 === 0;
    burstParticles.push({
      x: fromLeft ? -20 : particleWidth + 20,
      y: particleHeight * (.18 + Math.random() * .62),
      vx: (fromLeft ? 1 : -1) * (1.3 + Math.random() * 2.2),
      vy: (Math.random() - .5) * 1.2,
      size: 2.6 + Math.random() * 4,
      alpha: .68,
      life: 1.5,
      decay: .0045,
      drag: .996,
      gravity: .006,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - .5) * .09,
      shape: "petal",
      color: index % 3 === 0 ? "243,239,231" : "233,180,168",
    });
  }
}

const celebrationTimers = [];
function clearCelebrationTimers() {
  celebrationTimers.splice(0).forEach((timer) => window.clearTimeout(timer));
}

function scheduleCelebration(callback, delay) {
  const timer = window.setTimeout(callback, delay);
  celebrationTimers.push(timer);
}

function runGrandCelebration(fullCeremony) {
  if (prefersReducedMotion) return;
  clearCelebrationTimers();
  const overlay = $("#grandCelebration");
  overlay.classList.remove("is-active");
  void overlay.offsetWidth;
  overlay.classList.add("is-active");
  document.body.classList.add("date-reveal-live");
  scheduleCelebration(() => {
    overlay.classList.remove("is-active");
    document.body.classList.remove("date-reveal-live");
  }, 2900);

  const scale = particleWidth < 600 ? .58 : 1;
  const fireworks = [
    { x: particleWidth * .2, y: particleHeight * .33, color: 0 },
    { x: particleWidth * .5, y: particleHeight * .22, color: 1 },
    { x: particleWidth * .8, y: particleHeight * .36, color: 2 },
  ];
  fireworks.forEach((firework, index) => {
    scheduleCelebration(() => createFirework(firework.x, firework.y, Math.round(62 * scale), firework.color), 260 + index * 230);
  });
  scheduleCelebration(() => createConfettiRain(Math.round((fullCeremony ? 125 : 72) * scale)), 720);

  if (fullCeremony) {
    document.body.classList.add("celebration-live");
    scheduleCelebration(() => createPetalWave(Math.round(60 * scale)), 1080);
    scheduleCelebration(() => createFirework(particleWidth * .36, particleHeight * .52, Math.round(70 * scale), 2), 1420);
    scheduleCelebration(() => createFirework(particleWidth * .67, particleHeight * .48, Math.round(70 * scale), 0), 1680);
    scheduleCelebration(() => document.body.classList.remove("celebration-live"), 7200);
  }
}

function stopFairytaleCelebration() {
  clearCelebrationTimers();
  const overlay = $("#fairytaleCelebration");
  overlay.classList.remove("is-active");
  overlay.setAttribute("aria-hidden", "true");
  document.body.classList.remove("fairytale-live");
  stopFireworkAudio();
  burstParticles = [];
}

function runFairytaleCelebration() {
  if (prefersReducedMotion) return;
  clearCelebrationTimers();
  const overlay = $("#fairytaleCelebration");
  overlay.classList.remove("is-active");
  void overlay.offsetWidth;
  overlay.classList.add("is-active");
  overlay.setAttribute("aria-hidden", "false");
  document.body.classList.remove("date-reveal-live", "celebration-live");
  document.body.classList.add("fairytale-live");
  startFireworkAudio();

  const isMobile = particleWidth < 600;
  const targets = isMobile ? [
    { x: .08, y: .14, color: 0 },
    { x: .92, y: .16, color: 2 },
    { x: .08, y: .32, color: 4 },
    { x: .92, y: .34, color: 1 },
    { x: .1, y: .5, color: 3 },
    { x: .9, y: .52, color: 5 },
    { x: .12, y: .68, color: 6 },
    { x: .88, y: .7, color: 0 },
  ] : [
    { x: .08, y: .2, color: 0 },
    { x: .22, y: .11, color: 2 },
    { x: .4, y: .17, color: 4 },
    { x: .72, y: .1, color: 3 },
    { x: .91, y: .2, color: 1 },
    { x: .13, y: .35, color: 5 },
    { x: .34, y: .29, color: 6 },
    { x: .82, y: .31, color: 0 },
    { x: .05, y: .12, color: 3 },
    { x: .47, y: .08, color: 5 },
    { x: .77, y: .21, color: 2 },
    { x: .96, y: .13, color: 4 },
  ];

  targets.forEach((target, index) => {
    const delay = 150 + index * 245;
    const x = particleWidth * target.x;
    const y = particleHeight * target.y;
    scheduleCelebration(() => {
      createFairytaleRocket(x, y, target.color);
      playFireworkLaunchSound();
    }, delay);
    const burstCount = isMobile ? (index % 2 ? 48 : 58) : (index % 2 ? 78 : 92);
    scheduleCelebration(() => {
      createFairytaleFirework(x, y, burstCount, target.color);
      playFireworkBurstSound();
    }, delay + 720);
  });
  if (isMobile) {
    scheduleCelebration(() => {
      createFairytaleFirework(particleWidth * .06, particleHeight * .3, 60, 3);
      playFireworkBurstSound();
    }, 2660);
    scheduleCelebration(() => {
      createFairytaleFirework(particleWidth * .94, particleHeight * .31, 60, 1);
      playFireworkBurstSound();
    }, 3110);
  } else {
    scheduleCelebration(() => {
      createFairytaleFirework(particleWidth * .28, particleHeight * .2, 124, 3);
      playFireworkBurstSound();
    }, 2870);
    scheduleCelebration(() => {
      createFairytaleFirework(particleWidth * .78, particleHeight * .2, 118, 1);
      playFireworkBurstSound();
    }, 3320);
  }
  scheduleCelebration(stopFairytaleCelebration, 9000);
}

function burstFromElement(element, count = 24) {
  if (!element) return;
  const rect = element.getBoundingClientRect();
  createBirthdayBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, count);
}

function animateParticles(time) {
  const delta = Math.min(2, (time - lastParticleFrame) / 16.67 || 1);
  lastParticleFrame = time;
  particleContext.clearRect(0, 0, particleWidth, particleHeight);

  ambientParticles.forEach((particle) => {
    particle.phase += .018 * delta;
    particle.x += (particle.vx + Math.sin(particle.phase) * .035) * delta;
    particle.y += particle.vy * delta;
    const dx = particle.x - pointerPosition.x;
    const dy = particle.y - pointerPosition.y;
    const distanceSquared = dx * dx + dy * dy;
    if (distanceSquared < 8500 && distanceSquared > 1) {
      const force = (1 - distanceSquared / 8500) * .13;
      particle.x += dx * force * delta;
      particle.y += dy * force * delta;
    }
    if (particle.y > particleHeight + 8) particle.y = -8;
    if (particle.x > particleWidth + 8) particle.x = -8;
    if (particle.x < -8) particle.x = particleWidth + 8;
    drawParticle(particle, particle.alpha * (.7 + Math.sin(particle.phase) * .3));
  });

  burstParticles.forEach((particle) => {
    particle.life -= (particle.decay ?? .018) * delta;
    const drag = particle.drag ?? .985;
    particle.vx *= Math.pow(drag, delta);
    particle.vy = particle.vy * Math.pow(drag, delta) + (particle.gravity ?? .025) * delta;
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.phase += .1 * delta;
    particle.rotation = (particle.rotation || 0) + (particle.spin || 0) * delta;
    if (particle.y > particleHeight + 80) particle.life = 0;
    drawParticle(particle, Math.min(1, particle.life) * particle.alpha);
  });
  burstParticles = burstParticles.filter((particle) => particle.life > 0);
  const burstLimit = document.body.classList.contains("fairytale-live")
    ? (particleWidth < 600 ? 560 : 840)
    : 620;
  if (burstParticles.length > burstLimit) burstParticles.splice(0, burstParticles.length - burstLimit);
  window.requestAnimationFrame(animateParticles);
}

resizeParticleCanvas();
if (!prefersReducedMotion) window.requestAnimationFrame(animateParticles);
window.addEventListener("resize", resizeParticleCanvas);
let lastButterflyTrail = { x: -1000, y: -1000, time: 0 };
window.addEventListener("pointermove", (event) => {
  pointerPosition.x = event.clientX;
  pointerPosition.y = event.clientY;
  if (!hasFinePointer || document.body.classList.contains("fairytale-live") || letterSection.classList.contains("is-in-view")) return;
  const now = performance.now();
  const distance = Math.hypot(event.clientX - lastButterflyTrail.x, event.clientY - lastButterflyTrail.y);
  if (distance < 28 || now - lastButterflyTrail.time < 52) return;
  lastButterflyTrail = { x: event.clientX, y: event.clientY, time: now };
  createButterflyTrail(event.clientX, event.clientY, 1);
}, { passive: true });
document.addEventListener("pointerdown", (event) => {
  if (document.body.classList.contains("fairytale-live")) {
    createFairytaleFirework(event.clientX, event.clientY, particleWidth < 600 ? 58 : 78, Math.floor(Math.random() * fairytalePalette.length));
    playFireworkBurstSound();
    return;
  }
  if (event.target instanceof Element && event.target.closest("#letter")) return;
  createBirthdayBurst(event.clientX, event.clientY, 6);
  createButterflyTrail(event.clientX, event.clientY, event.pointerType === "touch" ? 4 : 2);
}, { passive: true });

const blessingResult = $("#blessingResult");
$$('.blessing-option').forEach((option, optionIndex) => {
  option.setAttribute("aria-pressed", "false");
  option.addEventListener("click", () => {
    $$(".blessing-option").forEach((button) => {
      button.classList.remove("is-selected");
      button.setAttribute("aria-pressed", "false");
    });
    option.classList.add("is-selected");
    option.setAttribute("aria-pressed", "true");
    blessingResult.textContent = option.dataset.blessing;
    blessingResult.classList.remove("is-written");
    window.requestAnimationFrame(() => blessingResult.classList.add("is-written"));
    burstFromElement(option, 22);
    createButterflyCluster(option, 4);
    playWishChime(optionIndex);
  });
});

// The completed constellation opens a short, full-screen meteor scene.
const meteorShower = $("#meteorShower");
const meteorShowerCanvas = $("#meteorShowerCanvas");
const meteorShowerContext = meteorShowerCanvas.getContext("2d");
let meteorShowerDpr = 1;
let meteorShowerWidth = 1;
let meteorShowerHeight = 1;
let meteorShowerFrame = 0;
let meteorShowerStartedAt = 0;
let meteorShowerStopTimer = 0;
let meteorShowerPlayed = false;
let meteorStars = [];
let meteorTracks = [];
const meteorPalette = [
  { primary: "255,102,174", secondary: "255,190,216" },
  { primary: "255,204,94", secondary: "255,137,102" },
  { primary: "84,221,255", secondary: "116,151,255" },
  { primary: "82,238,176", secondary: "93,205,255" },
  { primary: "185,117,255", secondary: "255,112,219" },
  { primary: "255,104,88", secondary: "255,191,92" },
];

function resizeMeteorShowerCanvas() {
  meteorShowerWidth = Math.max(1, window.innerWidth);
  meteorShowerHeight = Math.max(1, window.innerHeight);
  meteorShowerDpr = Math.min(window.devicePixelRatio || 1, 2);
  meteorShowerCanvas.width = Math.round(meteorShowerWidth * meteorShowerDpr);
  meteorShowerCanvas.height = Math.round(meteorShowerHeight * meteorShowerDpr);
  meteorShowerContext.setTransform(meteorShowerDpr, 0, 0, meteorShowerDpr, 0, 0);
}

function buildMeteorShowerScene() {
  const isMobile = meteorShowerWidth < 640;
  const starCount = isMobile ? 46 : 92;
  meteorStars = Array.from({ length: starCount }, () => ({
    x: Math.random(),
    y: Math.random() * .82,
    radius: .35 + Math.random() * 1.15,
    alpha: .12 + Math.random() * .42,
    phase: Math.random() * Math.PI * 2,
    speed: .0008 + Math.random() * .0015,
    color: Math.floor(Math.random() * meteorPalette.length),
  }));

  meteorTracks = [];
  const waves = isMobile
    ? [{ start: 520, count: 7 }, { start: 1880, count: 9 }, { start: 3400, count: 11 }, { start: 5050, count: 8 }]
    : [{ start: 480, count: 11 }, { start: 1740, count: 14 }, { start: 3200, count: 17 }, { start: 4920, count: 13 }];

  waves.forEach((wave, waveIndex) => {
    for (let index = 0; index < wave.count; index += 1) {
      const depth = .5 + Math.random() * .85;
      meteorTracks.push({
        start: wave.start + Math.random() * 740,
        duration: (980 + Math.random() * 780) / (.78 + depth * .28),
        x: .18 + Math.random() * 1.15,
        y: -.14 + Math.random() * .5,
        distance: .5 + Math.random() * .64,
        slope: .36 + Math.random() * .22,
        length: (.075 + Math.random() * .105) * (.82 + depth * .25),
        width: .55 + depth * 1.15,
        alpha: .68 + Math.random() * .3,
        color: (index + waveIndex * 2 + Math.floor(Math.random() * 3)) % meteorPalette.length,
        fragments: Math.random() > .58 ? 3 : 0,
      });
    }
  });

  meteorTracks.push(
    { start: 1450, duration: 1650, x: 1.16, y: .08, distance: 1.28, slope: .54, length: .23, width: 2.2, alpha: 1, color: 4, fragments: 6 },
    { start: 3920, duration: 1780, x: .94, y: -.02, distance: 1.12, slope: .6, length: .27, width: 2.45, alpha: 1, color: 2, fragments: 7 },
    { start: 5350, duration: 1580, x: 1.08, y: .18, distance: 1.18, slope: .48, length: .24, width: 2.25, alpha: 1, color: 1, fragments: 6 },
  );
}

function drawMeteorStar(star, elapsed) {
  const twinkle = .62 + Math.sin(elapsed * star.speed + star.phase) * .38;
  meteorShowerContext.beginPath();
  meteorShowerContext.arc(star.x * meteorShowerWidth, star.y * meteorShowerHeight, star.radius, 0, Math.PI * 2);
  const color = meteorPalette[star.color].primary;
  meteorShowerContext.fillStyle = `rgba(${color},${star.alpha * twinkle})`;
  meteorShowerContext.fill();
}

function drawMeteor(track, elapsed) {
  const progress = (elapsed - track.start) / track.duration;
  if (progress <= 0 || progress >= 1) return;

  const x = (track.x - track.distance * progress) * meteorShowerWidth;
  const y = (track.y + track.distance * track.slope * progress) * meteorShowerHeight;
  const vx = -track.distance * meteorShowerWidth;
  const vy = track.distance * track.slope * meteorShowerHeight;
  const velocity = Math.hypot(vx, vy) || 1;
  const ux = vx / velocity;
  const uy = vy / velocity;
  const tailLength = Math.hypot(meteorShowerWidth, meteorShowerHeight) * track.length;
  const tailX = x - ux * tailLength;
  const tailY = y - uy * tailLength;
  const fade = Math.min(1, progress * 7, (1 - progress) * 5) * track.alpha;
  const palette = meteorPalette[track.color];
  const color = palette.primary;
  const accent = palette.secondary;

  meteorShowerContext.save();
  meteorShowerContext.globalCompositeOperation = "lighter";
  meteorShowerContext.lineCap = "round";
  const glow = meteorShowerContext.createLinearGradient(tailX, tailY, x, y);
  glow.addColorStop(0, `rgba(${color},0)`);
  glow.addColorStop(.48, `rgba(${color},${fade * .1})`);
  glow.addColorStop(.78, `rgba(${color},${fade * .48})`);
  glow.addColorStop(.94, `rgba(${accent},${fade * .86})`);
  glow.addColorStop(1, `rgba(255,250,240,${fade})`);
  meteorShowerContext.strokeStyle = glow;
  meteorShowerContext.lineWidth = track.width * 4.2;
  meteorShowerContext.shadowColor = `rgba(${color},${fade * .8})`;
  meteorShowerContext.shadowBlur = 18 * track.width;
  meteorShowerContext.beginPath();
  meteorShowerContext.moveTo(tailX, tailY);
  meteorShowerContext.lineTo(x, y);
  meteorShowerContext.stroke();

  meteorShowerContext.lineWidth = Math.max(.7, track.width * .72);
  meteorShowerContext.shadowBlur = 4;
  meteorShowerContext.beginPath();
  meteorShowerContext.moveTo(tailX + (x - tailX) * .22, tailY + (y - tailY) * .22);
  meteorShowerContext.lineTo(x, y);
  meteorShowerContext.stroke();

  const headRadius = 6 + track.width * 3.8;
  const headGlow = meteorShowerContext.createRadialGradient(x, y, 0, x, y, headRadius);
  headGlow.addColorStop(0, `rgba(255,255,247,${fade})`);
  headGlow.addColorStop(.2, `rgba(${accent},${fade * .9})`);
  headGlow.addColorStop(1, `rgba(${color},0)`);
  meteorShowerContext.fillStyle = headGlow;
  meteorShowerContext.beginPath();
  meteorShowerContext.arc(x, y, headRadius, 0, Math.PI * 2);
  meteorShowerContext.fill();

  for (let index = 1; index <= track.fragments; index += 1) {
    const distance = tailLength * (.16 + index * .1);
    const drift = Math.sin(track.start * .01 + index * 1.7) * 5;
    meteorShowerContext.beginPath();
    meteorShowerContext.arc(x - ux * distance - uy * drift, y - uy * distance + ux * drift, Math.max(.45, track.width * .38), 0, Math.PI * 2);
    const fragmentColor = index % 2 ? color : accent;
    meteorShowerContext.fillStyle = `rgba(${fragmentColor},${fade * (.42 - index * .038)})`;
    meteorShowerContext.fill();
  }
  meteorShowerContext.restore();
}

function stopMeteorShower() {
  window.cancelAnimationFrame(meteorShowerFrame);
  window.clearTimeout(meteorShowerStopTimer);
  meteorShowerFrame = 0;
  meteorShower.classList.remove("is-active");
  meteorShowerContext.clearRect(0, 0, meteorShowerWidth, meteorShowerHeight);
}

function animateMeteorShower(time) {
  if (!meteorShowerStartedAt) meteorShowerStartedAt = time;
  const elapsed = time - meteorShowerStartedAt;
  meteorShowerContext.clearRect(0, 0, meteorShowerWidth, meteorShowerHeight);
  meteorStars.forEach((star) => drawMeteorStar(star, elapsed));
  meteorTracks.forEach((track) => drawMeteor(track, elapsed));
  if (elapsed < 8600) meteorShowerFrame = window.requestAnimationFrame(animateMeteorShower);
}

function launchMeteorShower() {
  if (meteorShowerPlayed || prefersReducedMotion) return;
  meteorShowerPlayed = true;
  resizeMeteorShowerCanvas();
  buildMeteorShowerScene();
  meteorShower.classList.remove("is-active");
  void meteorShower.offsetWidth;
  meteorShower.classList.add("is-active");
  meteorShowerStartedAt = 0;
  meteorShowerFrame = window.requestAnimationFrame(animateMeteorShower);
  meteorShowerStopTimer = window.setTimeout(stopMeteorShower, 8700);
}

window.addEventListener("resize", resizeMeteorShowerCanvas);

const constellationStage = $("#constellationStage");
const constellationCanvas = $("#constellationCanvas");
const constellationContext = constellationCanvas.getContext("2d");
const constellationNodes = $$(".constellation-node");
const futureSection = $("#future");
const litConstellationNodes = [];
let constellationDpr = 1;

function resizeConstellation() {
  const rect = constellationStage.getBoundingClientRect();
  constellationDpr = Math.min(window.devicePixelRatio || 1, 2);
  constellationCanvas.width = Math.max(1, Math.round(rect.width * constellationDpr));
  constellationCanvas.height = Math.max(1, Math.round(rect.height * constellationDpr));
  constellationContext.setTransform(constellationDpr, 0, 0, constellationDpr, 0, 0);
  drawConstellation();
}

function drawConstellation() {
  const stageRect = constellationStage.getBoundingClientRect();
  constellationContext.clearRect(0, 0, stageRect.width, stageRect.height);
  if (litConstellationNodes.length < 2) return;
  const points = litConstellationNodes.map((node) => {
    const rect = node.getBoundingClientRect();
    return { x: rect.left - stageRect.left + rect.width / 2, y: rect.top - stageRect.top + rect.height / 2 };
  });
  constellationContext.save();
  constellationContext.beginPath();
  constellationContext.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach((point) => constellationContext.lineTo(point.x, point.y));
  constellationContext.lineWidth = 1.2;
  constellationContext.strokeStyle = "rgba(233,180,168,.72)";
  constellationContext.shadowColor = "rgba(233,180,168,.55)";
  constellationContext.shadowBlur = 12;
  constellationContext.stroke();
  constellationContext.restore();
}

const constellationMessage = $("#constellationMessage");
const constellationCount = $("#constellationCount");
constellationStage.addEventListener("pointermove", (event) => {
  const rect = constellationStage.getBoundingClientRect();
  constellationStage.style.setProperty("--constellation-x", `${((event.clientX - rect.left) / rect.width * 100).toFixed(1)}%`);
  constellationStage.style.setProperty("--constellation-y", `${((event.clientY - rect.top) / rect.height * 100).toFixed(1)}%`);
});
constellationNodes.forEach((node, nodeIndex) => {
  node.setAttribute("aria-pressed", "false");
  node.addEventListener("click", () => {
    if (node.classList.contains("is-lit")) return;
    node.classList.add("is-lit");
    node.setAttribute("aria-pressed", "true");
    litConstellationNodes.push(node);
    constellationCount.textContent = `${String(litConstellationNodes.length).padStart(2, "0")} / 05`;
    constellationMessage.textContent = `已点亮：${litConstellationNodes.map((item) => item.dataset.word).join(" · ")}`;
    drawConstellation();
    burstFromElement(node, 18);
    createButterflyCluster(node, 3);
    playWishChime(nodeIndex);
    if (litConstellationNodes.length === constellationNodes.length) {
      constellationMessage.textContent = "未来星图已完成：生日之后，我们慢慢把这些愿望拍成照片。";
      constellationMessage.classList.add("is-complete");
      futureSection.classList.add("is-constellation-complete");
      burstFromElement(constellationStage, 72);
      window.setTimeout(launchMeteorShower, prefersReducedMotion ? 0 : 420);
    }
  });
});
resizeConstellation();
window.addEventListener("resize", resizeConstellation);

const chatGallery = $("#chatGallery");
const chatHeartItems = chatGallery ? $$(".chat-heart-item", chatGallery) : [];
const chatHeartSkip = $("#chatHeartSkip");

function setChatHeartItemInteractive(item, isInteractive) {
  item.inert = !isInteractive;
  item.setAttribute("aria-hidden", String(!isInteractive));
}

function completeChatHeartImmediately() {
  if (!chatGallery) return;
  chatGallery.classList.remove("is-heart-enhanced");
  chatGallery.classList.add("is-heart-complete");
  chatGallery.dataset.heartProgress = `${String(chatHeartItems.length).padStart(2, "0")} / ${String(chatHeartItems.length).padStart(2, "0")}`;
  chatGallery.dataset.heartState = "complete";
  if (chatHeartSkip) chatHeartSkip.hidden = true;
  chatHeartItems.forEach((item) => {
    item.classList.remove("is-arriving", "is-reading");
    item.classList.add("is-settled");
    setChatHeartItemInteractive(item, true);
  });
}

function isChatHeartPaused() {
  const focusedElement = document.activeElement;
  const hasFocusedCard = focusedElement instanceof HTMLElement
    && focusedElement.matches(":focus-visible")
    && chatHeartItems.some((item) => item.contains(focusedElement));
  return document.hidden
    || !lightbox.hidden
    || document.body.classList.contains("ceremony-pending")
    || document.body.classList.contains("ceremony-opening")
    || hasFocusedCard
    || (hasFinePointer && chatHeartItems.some((item) => item.matches(":hover")));
}

function waitForChatHeart(duration) {
  return new Promise((resolve) => {
    let remaining = duration;
    let previousTime = performance.now();

    function countDown(currentTime) {
      if (chatGallery?.dataset.heartState === "complete") {
        resolve();
        return;
      }
      if (!isChatHeartPaused()) remaining -= Math.min(currentTime - previousTime, 64);
      previousTime = currentTime;
      if (remaining <= 0) {
        resolve();
        return;
      }
      window.requestAnimationFrame(countDown);
    }

    window.requestAnimationFrame(countDown);
  });
}

function waitForChatHeartImage(image, maxWait = 1200) {
  if (!image || (image.complete && image.naturalWidth > 0)) return Promise.resolve();
  const ready = typeof image.decode === "function"
    ? image.decode().catch(() => {})
    : new Promise((resolve) => {
      image.addEventListener("load", resolve, { once: true });
      image.addEventListener("error", resolve, { once: true });
    });
  return Promise.race([
    ready,
    new Promise((resolve) => window.setTimeout(resolve, maxWait)),
  ]);
}

async function prepareChatHeartImages() {
  const images = $$("img", chatGallery);
  images.forEach((image) => { image.loading = "eager"; });
  await Promise.all(images.slice(0, 2).map((image) => waitForChatHeartImage(image)));
}

async function runChatHeartSequence() {
  if (!chatGallery || chatGallery.dataset.heartState !== "waiting") return;
  chatGallery.dataset.heartState = "preparing";
  await prepareChatHeartImages();
  chatGallery.dataset.heartState = "running";
  await waitForChatHeart(40);
  if (chatGallery.dataset.heartState !== "running") return;
  if (chatHeartSkip) chatHeartSkip.hidden = false;

  for (const [index, item] of chatHeartItems.entries()) {
    await waitForChatHeartImage($("img", item), 1800);
    if (chatGallery.dataset.heartState !== "running") return;
    setChatHeartItemInteractive(item, true);
    item.classList.add("is-arriving");
    chatGallery.dataset.heartProgress = `${String(index + 1).padStart(2, "0")} / ${String(chatHeartItems.length).padStart(2, "0")}`;
    await waitForChatHeart(820);
    if (chatGallery.dataset.heartState !== "running") return;
    item.classList.add("is-reading");
    await waitForChatHeart(1250);
    if (chatGallery.dataset.heartState !== "running") return;
    item.classList.remove("is-reading");
    item.classList.replace("is-arriving", "is-settled");
    await waitForChatHeart(index === chatHeartItems.length - 1 ? 820 : 280);
    if (chatGallery.dataset.heartState !== "running") return;
  }

  chatGallery.classList.add("is-heart-complete");
  chatGallery.dataset.heartState = "complete";
  if (chatHeartSkip) chatHeartSkip.hidden = true;
}

if (chatGallery && chatHeartItems.length) {
  chatHeartItems.forEach((item) => {
    const image = $("img", item);
    if (image) item.style.setProperty("--chat-preview", `url("${image.src}")`);
  });
  chatHeartSkip?.addEventListener("click", completeChatHeartImmediately);
  chatGallery.addEventListener("focusin", (event) => {
    if (event.target instanceof Element && event.target.closest(".chat-frame")) completeChatHeartImmediately();
  });
  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    completeChatHeartImmediately();
  } else {
    chatGallery.classList.add("is-heart-enhanced");
    chatGallery.dataset.heartState = "waiting";
    chatHeartItems.forEach((item) => setChatHeartItemInteractive(item, false));
    const chatHeartObserver = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      chatHeartObserver.disconnect();
      void runChatHeartSequence();
    }, { threshold: 0, rootMargin: "-12% 0px -12%" });
    chatHeartObserver.observe($(".chat-heart-trigger", chatGallery) || chatGallery);
  }
}

const revealTargets = $$(
  ".birthday-opening-mark, .birthday-art, .birthday-opening-copy > *, .favorite-page-head > *, .favorite-universe, .page-turn-copy > *, .portrait-edition-meta, .manifesto-grid > *, .portrait-stage .image-card, .conversation-intro > *, .future > h2, .future-title-ja, .future-lead, .constellation-shell, .letter-cover > *, .finale-copy > *, .finale-visual, .finale-end"
);
revealTargets.forEach((target, index) => {
  target.classList.add("reveal-on-scroll");
  if (index % 3 === 1) target.classList.add("reveal-delay-one");
  if (index % 3 === 2) target.classList.add("reveal-delay-two");
});

if (prefersReducedMotion || !("IntersectionObserver" in window)) {
  revealTargets.forEach((target) => target.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: .12, rootMargin: "0px 0px -7%" });
  revealTargets.forEach((target) => revealObserver.observe(target));
}

bindGalleryCards();
bindMagneticControls();
updateSoundState(!backgroundMusic.paused);
updateReadingProgress();
updateHeaderTheme();
updateCharacterParallax();
updateSpatialMotion();
