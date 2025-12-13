export default class AuthService {
  constructor(authModel) {
    this.authModel = authModel;
    this.URL = "/api/auth";
  }

  async login(email, password) {
    const fetchResponse = await fetch(`${this.URL}/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type" : "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await fetchResponse.json();

    if (fetchResponse.ok) {
      this.authModel.setUser(data.user);
      window.opener?.postMessage(
        { type: "USER_LOGGED_IN" },
        "*"
      );
      window.postMessage({ type: "USER_LOGGED_IN" }, "*");
    }

    return {
      ok: fetchResponse.ok,
      data
    };
  }

  async logout() {
    const fetchResponse = await fetch(`${this.URL}/logout`, {
      method: "POST",
      credentials: "include",
    });

    const data = await fetchResponse.json().catch(() => ({}));

    if (fetchResponse.ok) {
      this.authModel.setUser(null);
    }

    return {
      ok: fetchResponse.ok,
      data,
    };
  }

  async me() {
    const fetchResponse = await fetch(`${this.URL}/me`, {
      credentials: "include",
    });

    const data = await fetchResponse.json();
    return {
      ok: fetchResponse.ok,
      ...data,
    }
  }
}