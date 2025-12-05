export default class LoginPresenter {
  constructor({ view, authModel, authService }) {
    this.view = view;
    this.authModel = authModel;
    this.authService = authService;
  }

  init() {
    const eye = document.querySelector("#eyeicon");
    const password = document.querySelector("#password-input");
    const loginBtn = document.querySelector("#login-btn");

    eye.addEventListener("click", () => {
      if (password.type === "password") {
        password.type = "text";
        eye.src = "public/images/icons/eye-open.png";
      } else {
        password.type = "password";
        eye.src = "public/images/icons/eye-close.png";
      }
    });

    loginBtn.addEventListener("click", () => this.onLogin());
  }

  async onLogin() {
    const email = document.querySelector("#email-input").value;
    const password = document.querySelector("#password-input").value;

    const { ok, data } = await this.authService.login(email, password);

    if (!ok) {
      alert(data.message || "Login gagal");
      return;
    }

    window.location.hash = "/chat";
  }
}
