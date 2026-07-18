export function initFaq(root = document) {
  root.querySelectorAll("[data-faq-trigger]").forEach((button) => {
    button.addEventListener("click", () => {
      const expanded = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!expanded));
      const panel = root.getElementById(button.getAttribute("aria-controls"));
      if (panel) panel.hidden = expanded;
    });
  });
}

if (typeof document !== "undefined") {
  initFaq(document);
  const year = document.querySelector("[data-current-year]");
  if (year) year.textContent = String(new Date().getFullYear());
}
