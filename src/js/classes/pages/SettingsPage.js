import Page from './Page';
import LibreClient from '../LibreClient';

export default class SettingsPage extends Page {
  /**
   * @type {string}
   * @readonly
   */
  static identifier = 'settings';

  /**
   * @type {LibreClient}
   */
  #libreClient;

  constructor(libreClient) {
    super(SettingsPage.identifier);

    this.#libreClient = libreClient;

    document.getElementById('login').addEventListener('click', this.login.bind(this));
  }

  /**
   * Retrieves entered inputs and logs in to librelink API
   */
  async login() {
    const errEl = document.getElementById('login-error');
    errEl.style.display = 'none';
    const loggedInEl = document.getElementById('logged-in');
    loggedInEl.style.display = 'none';

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    const maybeErr = await this.#libreClient.auth(email, password);
    if (maybeErr?.length) {
      errEl.textContent = maybeErr;
      errEl.style.display = 'block';
      return;
    }

    loggedInEl.style.display = 'block';
  }
}
