document.documentElement.classList.add("js");

const menuButton = document.querySelector(".menu-toggle");
const header = document.querySelector(".nav");

if (menuButton && header) {
  const pageContent = [...document.body.children].filter(
    (element) =>
      element !== header &&
      !element.classList.contains("skip-link") &&
      !element.classList.contains("living-pulse-rail")
  );
  const closeMenu = () => {
    if (!header.classList.contains("menu-open")) return;
    header.classList.remove("menu-open");
    document.body.classList.remove("menu-is-open");
    menuButton.setAttribute("aria-expanded", "false");
    pageContent.forEach((element) => { element.inert = false; });
  };

  menuButton.addEventListener("click", () => {
    const nextState = !header.classList.contains("menu-open");
    header.classList.toggle("menu-open", nextState);
    document.body.classList.toggle("menu-is-open", nextState);
    menuButton.setAttribute("aria-expanded", String(nextState));
    pageContent.forEach((element) => { element.inert = nextState; });
    if (nextState) header.querySelector(".menu a")?.focus();
  });

  header.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && header.classList.contains("menu-open")) {
      closeMenu();
      menuButton.focus();
    }
  });
}

const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
let revealObserver;

function enableMotion() {
  if (motionPreference.matches || !("IntersectionObserver" in window)) return;
  const revealTargets = document.querySelectorAll(
    ".site-redesign:not(.route-index) .hero .wrap, .site-redesign:not(.route-index) main > .lead, .site-redesign:not(.route-index) main > h2, .site-redesign:not(.route-index) main > .fgrid, .site-redesign:not(.route-index) main > .svc-grid, .site-redesign:not(.route-index) main > .cta-band, .site-redesign:not(.route-index) main > .faq, .site-redesign:not(.route-index) main > .related"
  );
  revealTargets.forEach((target) => target.classList.add("content-reveal"));
  document.documentElement.classList.add("motion-ready");

  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -7% 0px" }
  );

  revealTargets.forEach((target) => revealObserver.observe(target));
}

function disableMotion() {
  revealObserver?.disconnect();
  revealObserver = undefined;
  document.documentElement.classList.remove("motion-ready");
  document.querySelectorAll(".content-reveal").forEach((target) => target.classList.add("is-visible"));
}

enableMotion();
motionPreference.addEventListener("change", () => {
  if (motionPreference.matches) disableMotion();
  else enableMotion();
});

const signalRail = document.querySelector(".living-pulse-rail");
const signalDot = signalRail?.querySelector(".rail-dot");
const signalWave = signalRail?.querySelector("svg");
let signalFrame;

function updateSignalRail() {
  signalFrame = undefined;
  if (!signalRail || !signalDot) return;
  const scrollRange = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const progress = Math.min(1, Math.max(0, window.scrollY / scrollRange));
  const horizontal = window.matchMedia("(max-width: 1000px)").matches;
  const trackLength = horizontal
    ? signalRail.clientWidth
    : (signalWave?.clientHeight || signalRail.clientHeight);
  const travel = Math.max(0, trackLength - signalDot.offsetWidth);
  signalRail.style.setProperty("--rail-shift", `${Math.round(progress * travel)}px`);
}

function scheduleSignalRail() {
  if (signalFrame) return;
  signalFrame = window.requestAnimationFrame(updateSignalRail);
}

if (signalRail) {
  updateSignalRail();
  window.addEventListener("scroll", scheduleSignalRail, { passive: true });
  window.addEventListener("resize", scheduleSignalRail, { passive: true });
}

const currentFile = location.pathname.split("/").pop() || "index.html";
document.querySelectorAll(".nav a, .site-header a").forEach((link) => {
  const target = new URL(link.href, location.href).pathname.split("/").pop() || "index.html";
  if (target === currentFile && !link.hash) link.setAttribute("aria-current", "page");
});

const pillarCards = [...document.querySelectorAll(".route-index .pillar")];
const desktopHover = window.matchMedia("(min-width: 1001px) and (hover: hover) and (pointer: fine)");

function setPillarState(card, expanded) {
  const toggle = card.querySelector(".pillar-toggle");
  const detail = card.querySelector(".pillar-detail");
  card.classList.toggle("is-expanded", expanded);
  toggle?.setAttribute("aria-expanded", String(expanded));
  if (detail) detail.setAttribute("aria-hidden", String(!expanded));
  const label = toggle?.querySelector("span");
  if (label) label.textContent = expanded ? "Close pillar" : "Explore pillar";
}

function closeOtherPillars(activeCard) {
  pillarCards.forEach((card) => {
    if (card !== activeCard) setPillarState(card, false);
  });
}

pillarCards.forEach((card) => {
  const toggle = card.querySelector(".pillar-toggle");

  card.addEventListener("pointerenter", () => {
    if (!desktopHover.matches) return;
    closeOtherPillars(card);
    setPillarState(card, true);
  });

  card.addEventListener("pointerleave", () => {
    if (desktopHover.matches && !card.contains(document.activeElement)) {
      setPillarState(card, false);
    }
  });

  card.addEventListener("click", (event) => {
    if (desktopHover.matches || event.target.closest(".pillar-toggle")) return;
    closeOtherPillars(card);
    setPillarState(card, !card.classList.contains("is-expanded"));
  });

  toggle?.addEventListener("click", () => {
    const nextState = !card.classList.contains("is-expanded");
    closeOtherPillars(card);
    setPillarState(card, nextState);
  });

  card.addEventListener("focusin", () => {
    closeOtherPillars(card);
    card.querySelector(".pillar-detail")?.setAttribute("aria-hidden", "false");
  });

  card.addEventListener("focusout", (event) => {
    if (!card.contains(event.relatedTarget)) setPillarState(card, false);
  });
});
