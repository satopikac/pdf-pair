(() => {
  const lessons = [...document.querySelectorAll("[data-lesson]")];
  const checks = [...document.querySelectorAll(".check-row input")];
  const progressBar = document.querySelector("#progress-bar");
  const progressText = document.querySelector("#progress-text");
  const reset = document.querySelector("#reset-progress");
  const storageKey = "pdf-pair-learning-progress-v1";

  function updateProgress() {
    const completed = checks.filter((item) => item.checked).length;
    const percent = checks.length ? Math.round((completed / checks.length) * 100) : 0;
    progressBar.style.width = `${percent}%`;
    progressText.textContent = `${percent}%`;
    localStorage.setItem(storageKey, JSON.stringify(checks.map((item) => item.checked)));
  }

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
    checks.forEach((item, index) => { item.checked = saved[index] === true; });
  } catch (_) { /* Local progress is optional. */ }
  checks.forEach((item) => item.addEventListener("change", updateProgress));
  reset.addEventListener("click", () => {
    checks.forEach((item) => { item.checked = false; });
    updateProgress();
  });
  updateProgress();

  const links = [...document.querySelectorAll("#toc a")];
  const observer = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    links.forEach((link) => link.classList.toggle("active", link.hash === `#${visible.target.id}`));
  }, { rootMargin: "-20% 0px -65% 0px", threshold: [0, .2, .5, 1] });
  lessons.forEach((lesson) => observer.observe(lesson));

  const menu = document.querySelector(".menu-button");
  const sidebar = document.querySelector(".sidebar");
  menu.addEventListener("click", () => {
    const open = sidebar.classList.toggle("open");
    menu.setAttribute("aria-expanded", String(open));
  });
  links.forEach((link) => link.addEventListener("click", () => {
    sidebar.classList.remove("open");
    menu.setAttribute("aria-expanded", "false");
  }));
})();
