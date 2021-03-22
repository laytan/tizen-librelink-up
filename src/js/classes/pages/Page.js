export default class Page {
  name;
  el;

  constructor(identifier) {
    this.identifier = identifier;
    this.el = document.getElementById(`page-${identifier}`);
    if (!this.el) {
      throw new Error('Page element not found');
    }
  }

  /**
   * Shows the page element
   * @returns {undefined|string} If string show that page instead of this one
   */
  show() {
    this.el.style.display = 'block';
  }

  hide() {
    this.el.style.display = 'none';
  }
}
