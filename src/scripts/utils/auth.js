export default class AuthModel {
  constructor() {
    this.user = null;
  }

  setUser(user) {
    this.user = user;
  }

  getUser() {
    return this.user;
  }

  async checkSession(authService) {
    const fetchResponse = await authService.me();
    if (fetchResponse.ok) {
      this.user = fetchResponse.user;
      return true;
    }
    return false;
  }
}