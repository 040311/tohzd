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
let letterOpening = false;
let letterWritingTimer = 0;
let letterWritingIndex = 0;
let letterWritingActive = false;
let letterAutoFollow = true;
let letterLastFollowAt = 0;
const letterGlyphs = [];

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
    createButterflyCluster(letterSign, 4);
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
  letterCover.classList.add("is-unsealing");
  burstFromElement(letterOpen, 26);
  createButterflyCluster(letterOpen, 7);
  playWishChime(4);
  window.setTimeout(() => {
    letterCover.hidden = true;
    letterInside.hidden = false;
    burstFromElement(letterInside, 32);
    letterInside.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
    window.setTimeout(startLetterWriting, prefersReducedMotion ? 0 : 520);
  }, prefersReducedMotion ? 10 : 690);
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
let birthdayRecordingActive = false;
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
  const colors = ["233,180,168", "243,239,231", "170,205,211"];
  const amount = Math.min(count, 10);
  for (let index = 0; index < amount; index += 1) {
    burstParticles.push({
      x: x + (Math.random() - .5) * 18,
      y: y + (Math.random() - .5) * 14,
      vx: (Math.random() - .5) * .72,
      vy: -.28 - Math.random() * .58,
      size: 2 + Math.random() * 2.1,
      alpha: .38 + Math.random() * .34,
      life: 1,
      decay: .012 + Math.random() * .008,
      drag: .99,
      gravity: -.004,
      phase: Math.random() * Math.PI * 2,
      rotation: (Math.random() - .5) * .8,
      spin: (Math.random() - .5) * .045,
      shape: "butterfly",
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
  if (!hasFinePointer || document.body.classList.contains("fairytale-live")) return;
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

const revealTargets = $$(
  ".birthday-opening-mark, .birthday-art, .birthday-opening-copy > *, .favorite-page-head > *, .favorite-universe, .page-turn-copy > *, .portrait-edition-meta, .manifesto-grid > *, .portrait-stage .image-card, .conversation-intro > *, .chat-frame, .confession-rail > *, .confession-promise > *, .confession-side > *, .confession-foot > *, .future > h2, .future-lead, .constellation-shell, .letter-cover > *, .finale-copy > *, .finale-visual, .finale-end"
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
