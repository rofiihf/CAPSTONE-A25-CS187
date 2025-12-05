import LoginPage from "../pages/auth/login/login-view.js";

import MessageView from "../pages/message/messageView.js";
import MessagePresenter from "../pages/message/messagePresenter.js";
import MessageModel from "../pages/message/messageModel.js";

import AuthModel from "../utils/auth.js";
import AuthService from "../services/auth-services.js";

const authModel = new AuthModel();
const authService = new AuthService(authModel);

const routes = {
  "/login": "login",
  "/chat": "chat",
};

export async function router() {
  const root = document.querySelector("#app");
  const hash = window.location.hash.slice(1) || "/login";

  const isLoggedIn = await authModel.checkSession(authService);

  // Redirect login rules
  if (!isLoggedIn && hash !== "/login") {
    window.location.hash = "/login";
    return;
  }

  if (isLoggedIn && hash === "/login") {
    window.location.hash = "/chat";
    return;
  }

  const pageType = routes[hash] || "login";

  // ========================
  // PAGE: LOGIN
  // ========================
  if (pageType === "login") {
    const loginPage = new LoginPage({ authModel, authService });
    root.innerHTML = loginPage.render();
    loginPage.afterRender();
    return;
  }

  // ========================
  // PAGE: CHAT (MVP)
  // ========================
  if (pageType === "chat") {
    const model = new MessageModel();
    const presenter = new MessagePresenter({ model });
    const view = new MessageView({ presenter });

    presenter.setView(view);

    view.render();               // draw UI
    presenter.renderInitialMessages(); // load chat history
    return;
  }
}

window.addEventListener("hashchange", router);
window.addEventListener("load", router);
