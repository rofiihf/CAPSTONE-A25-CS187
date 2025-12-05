export function renderPage(html) {
  const root = document.querySelector("#app");
  root.innerHTML = html;
}