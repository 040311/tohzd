const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const hasFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

const lightbox = $("#lightbox");
const lightboxImage = $("#lightboxImage");
const lightboxChat = document.createElement("div");
lightboxChat.className = "lightbox-chat-preview";
lightboxChat.hidden = true;
$("#lightbox figure").prepend(lightboxChat);

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
    || $(".chat-foot", item)?.textContent?.trim()
    || item.dataset.title
    || "未命名的一页";
  $("#lightboxCaption").textContent = caption;
  const lightboxCounter = $("#lightboxCounter");
  lightboxCounter.hidden = activeGallery === "chats";
  lightboxCounter.textContent = activeGallery === "chats"
    ? ""
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
$("#lightboxPrev").addEventListener("click", () => moveLightbox(-1));
$("#lightboxNext").addEventListener("click", () => moveLightbox(1));
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

$("#birthdayWish").addEventListener("click", () => {
  const cake = $("#birthdayCake");
  const note = $("#birthdayWishNote");
  const isLit = cake.classList.toggle("is-lit");
  note.hidden = !isLit;
  $("#birthdayWish").classList.toggle("is-lit", isLit);
  $("#birthdayWish").firstChild.textContent = isLit ? "华紫蝶，这一岁已经点亮 " : "点这里，点亮这一岁 ";
  if (isLit) {
    void playBirthdayRecording();
    burstFromElement($("#birthdayCake"), 54);
    runGrandCelebration(true);
  } else {
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

$("#letterOpen").addEventListener("click", () => {
  $("#letterCover").hidden = true;
  $("#letterInside").hidden = false;
  burstFromElement($("#letterInside"), 32);
  $("#letterInside").scrollIntoView({ behavior: "smooth", block: "center" });
});

const soundControl = $("#soundControl");
const soundLabel = $("#soundLabel");
const backgroundMusic = $("#backgroundMusic");
const birthdayRecording = $("#birthdayRecording");
let birthdayRecordingActive = false;
backgroundMusic.volume = .46;
birthdayRecording.volume = .92;

function updateSoundState(isPlaying) {
  soundControl.classList.toggle("is-playing", isPlaying);
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
  void startBackgroundMusic();
}

async function playBirthdayRecording() {
  if (birthdayRecordingActive) return;
  birthdayRecordingActive = true;
  backgroundMusic.pause();
  birthdayRecording.currentTime = 0;
  updateSoundState(false);
  try {
    await birthdayRecording.play();
    updateSoundState(true);
  } catch {
    finishBirthdayRecording();
  }
}

soundControl.addEventListener("click", async () => {
  const soundtrack = activeSoundtrack();
  if (soundtrack.paused) await startActiveSoundtrack();
  else {
    soundtrack.pause();
    updateSoundState(false);
  }
});

backgroundMusic.addEventListener("play", () => {
  if (!birthdayRecordingActive) updateSoundState(true);
});
backgroundMusic.addEventListener("pause", () => {
  if (!birthdayRecordingActive) updateSoundState(false);
});
birthdayRecording.addEventListener("play", () => {
  if (birthdayRecordingActive) updateSoundState(true);
});
birthdayRecording.addEventListener("pause", () => {
  if (birthdayRecordingActive && !birthdayRecording.ended) updateSoundState(false);
});
birthdayRecording.addEventListener("ended", finishBirthdayRecording);
birthdayRecording.addEventListener("error", finishBirthdayRecording);
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

  await startBackgroundMusic();
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
  const darkSections = [$("#cover"), $("#pageTurn"), $("#future")];
  const isDark = darkSections.some((section) => checkpoint >= section.offsetTop && checkpoint < section.offsetTop + section.offsetHeight);
  $(".site-header").classList.toggle("on-dark", isDark);
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
}, { passive: true });
window.addEventListener("resize", () => {
  updateReadingProgress();
  updateHeaderTheme();
  scheduleCharacterParallax();
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
    card.classList.add("is-tilting");
  });
  card.addEventListener("pointerleave", () => {
    card.style.setProperty("--tilt-x", "0deg");
    card.style.setProperty("--tilt-y", "0deg");
    card.classList.remove("is-tilting");
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
    particleContext.beginPath();
    particleContext.moveTo(particle.x, particle.y);
    particleContext.lineTo(particle.x - particle.vx * 4.5, particle.y - particle.vy * 4.5);
    particleContext.strokeStyle = `rgba(${particle.color},${Math.max(0, alpha * .45)})`;
    particleContext.lineWidth = Math.max(.5, particle.size * .38);
    particleContext.stroke();
  }
  particleContext.translate(particle.x, particle.y);
  particleContext.rotate(particle.rotation ?? (particle.phase || 0) * .35);
  particleContext.fillStyle = `rgba(${particle.color},${Math.max(0, alpha)})`;
  const size = particle.size;
  if (particle.shape === "confetti") {
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
function scheduleCelebration(callback, delay) {
  const timer = window.setTimeout(callback, delay);
  celebrationTimers.push(timer);
}

function runGrandCelebration(fullCeremony) {
  if (prefersReducedMotion) return;
  celebrationTimers.splice(0).forEach((timer) => window.clearTimeout(timer));
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
  if (burstParticles.length > 620) burstParticles.splice(0, burstParticles.length - 620);
  window.requestAnimationFrame(animateParticles);
}

resizeParticleCanvas();
if (!prefersReducedMotion) window.requestAnimationFrame(animateParticles);
window.addEventListener("resize", resizeParticleCanvas);
window.addEventListener("pointermove", (event) => {
  pointerPosition.x = event.clientX;
  pointerPosition.y = event.clientY;
}, { passive: true });
document.addEventListener("pointerdown", (event) => {
  createBirthdayBurst(event.clientX, event.clientY, 7);
}, { passive: true });

const blessingResult = $("#blessingResult");
$$('.blessing-option').forEach((option) => {
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
  });
});

const constellationStage = $("#constellationStage");
const constellationCanvas = $("#constellationCanvas");
const constellationContext = constellationCanvas.getContext("2d");
const constellationNodes = $$(".constellation-node");
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
constellationNodes.forEach((node) => {
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
    if (litConstellationNodes.length === constellationNodes.length) {
      constellationMessage.textContent = "未来星图已完成：生日之后，我们慢慢把这些愿望拍成照片。";
      constellationMessage.classList.add("is-complete");
      burstFromElement(constellationStage, 72);
    }
  });
});
resizeConstellation();
window.addEventListener("resize", resizeConstellation);

const revealTargets = $$(
  ".birthday-opening-mark, .birthday-art, .birthday-opening-copy > *, .favorite-page-head > *, .favorite-universe, .page-turn-copy > *, .portrait-edition-meta, .manifesto-grid > *, .portrait-stage .image-card, .conversation-intro > *, .chat-frame, .future > h2, .future-lead, .constellation-shell, .letter-cover > *"
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
updateSoundState(!backgroundMusic.paused);
updateReadingProgress();
updateHeaderTheme();
updateCharacterParallax();
