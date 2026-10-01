(function () {
  const video = document.querySelector(".bg-video");
  if (!video) return;

  const sources = {
    desktop: video.getAttribute("data-video-desktop"),
    tablet: video.getAttribute("data-video-tablet"),
    mobile: video.getAttribute("data-video-mobile"),
  };

  function variant() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (width >= height) return "desktop";
    if (width <= 767) return "mobile";
    return "tablet";
  }

  let current = "";

  function apply() {
    const next = variant();
    const src = sources[next];
    if (!src || next === current) return;
    current = next;
    video.src = src;
    video.load();
    const play = video.play();
    if (play && typeof play.catch === "function") play.catch(function () {});
  }

  apply();

  let timer = 0;
  window.addEventListener("resize", function () {
    window.clearTimeout(timer);
    timer = window.setTimeout(apply, 150);
  });
  window.addEventListener("orientationchange", apply);
})();

(function () {
  const root = document.getElementById("langSwitcher");
  const toggle = document.getElementById("langToggle");
  const menu = document.getElementById("langMenu");

  if (!root || !toggle || !menu) return;

  function setOpen(isOpen) {
    root.classList.toggle("is-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
    menu.hidden = !isOpen;
  }

  toggle.addEventListener("click", function (event) {
    event.stopPropagation();
    setOpen(!root.classList.contains("is-open"));
  });

  document.addEventListener("click", function (event) {
    if (!root.contains(event.target)) setOpen(false);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") setOpen(false);
  });
})();
