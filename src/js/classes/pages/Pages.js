import Page from './Page';

export default class Pages {
  /**
   * @type {Object<string, Page>}
   */
  #pages = {};

  /**
   * @type {string}
   */
  #activePage;

  /**
   * @param  {...Page} pages
   */
  add(...pages) {
    pages.forEach(p => {
      this.#pages[p.identifier] = p;

      // Wire all .to-${identifier} to open the page
      const toLink = document.querySelectorAll(`.to-${p.identifier}`);
      toLink.forEach(l => {
        l.addEventListener('click', () => {
          this.switch(p.identifier);
        }); 
      });

      p.hide();
    });
  }

  switch(identifier) {
    if (!this.#pages[identifier]) {
      throw new Error('Page does not exist');
    }

    this.#pages[this.#activePage]?.hide();
    
    let toShowId = identifier;
    while (true) {
      const maybeOtherPage = this.#pages[toShowId].show();
      if (maybeOtherPage?.length) {
        toShowId = maybeOtherPage;
      } else {
        this.#activePage = toShowId;
        break;
      }
    }
  }
}
