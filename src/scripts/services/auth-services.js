export default class AuthService {
  constructor(authModel) {
    this.authModel = authModel;
    this.URL = "http://localhost:5000/api/auth";
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
    }

    return {
      ok: fetchResponse.ok,
      data
    };
  }

  async logout() {
    return fetch(`${this.URL}/logout`, {
      method: "POST",
      credentials: "include",
    }).then (r => r.json());
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