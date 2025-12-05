import LoginPresenter from "./login-presenter.js";

export default class LoginPage {
  constructor({ authModel, authService }) {
    this.authModel = authModel;
    this.authService = authService;
    this.presenter = new LoginPresenter({
      view: this,
      authModel,
      authService
    });
  }

  render() {
    return `
      <div class="login-container">
        <div class="login-form-container">
          <div class="login-title">
            <h1>Masuk</h1>
          </div>

          <div class="form-control">
            <!-- <label for="email-input" class="login-form-email">Email</label> -->
            <input type="email" aria-label="Email" name="email" id="email-input" placeholder="Email">
          </div>

          <div class="form-control">
            <!-- <label for="password-input" class="login-form-password">Password</label> -->
            <input type="password" aria-label="Password" name="password" id="password-input" placeholder="Password">
            <img src="public/images/icons/eye-close.png" alt="hide password" id="eyeicon">
          </div>

          <div class="submit-button-container">
            <button class="submit-login-button" id="login-btn">Masuk</button>
          </div>
        </div>
      </div>
    `
  }

  async afterRender() {
    this.presenter.init();
  }

}