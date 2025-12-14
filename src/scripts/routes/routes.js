import LoginPage from "../pages/auth/login/login-view.js";
import MessageView from "../pages/message/messageView.js";
import MessagePresenter from "../pages/message/messagePresenter.js";
import MessageModel from "../pages/message/messageModel.js";

import AuthModel from "../utils/auth.js";
import AuthService from "../services/auth-services.js";
import { loadCourseMap } from "../data/api.js";

const authModel = new AuthModel();
const authService = new AuthService(authModel);

const routes = {
  "/login": "login",
  "/chat": "chat",
};

let lastHash = null;

export async function router() {
  const root = document.querySelector("#app");
  const hash = window.location.hash.slice(1) || "/login";

  // Prevent duplicate routing
  if (hash === lastHash) return;
  lastHash = hash;

  let isLoggedIn = false;

  // Only check session if not on login page
  if (hash !== "/login") {
    isLoggedIn = await authModel.checkSession(authService);
  }

  // Redirect rules
  if (!isLoggedIn && hash !== "/login") {
    lastHash = "/login"; // avoid re-trigger
    window.location.hash = "/login";
    return;
  }

  if (isLoggedIn && hash === "/login") {
    lastHash = "/chat";
    window.location.hash = "/chat";
    return;
  }

  const pageType = routes[hash] || "login";

  // LOGIN PAGE
  if (pageType === "login") {
    const loginPage = new LoginPage({ authModel, authService });
    root.innerHTML = loginPage.render();
    loginPage.afterRender();
    return;
  }

  // CHAT PAGE
  if (pageType === "chat") {
    const model = new MessageModel();

    const courseMapResp = await loadCourseMap();
    const courseMap = courseMapResp.ok ? courseMapResp.courses : [];

    const presenter = new MessagePresenter({
      model,
      authModel,
      authService,
      courseMap, 
    });

    const view = new MessageView({ presenter });

    presenter.setProfile(authModel.getUser());
    presenter.setView(view);
    view.render();
    return;
  }
}

window.addEventListener("hashchange", router);
window.addEventListener("load", router);