import "regenerator-runtime/runtime.js";
import LibreClient from './classes/LibreClient';
import Pages from './classes/pages/Pages';
import SettingsPage from './classes/pages/SettingsPage';
import GraphPage from './classes/pages/GraphPage';

window.onload = () => {
  document.addEventListener("tizenhwkey", (e) => {
    if (e.keyName === "back") {
      try {
        tizen.application.getCurrentApplication().exit();
      } catch (ignore) {}
    }
  });

  const client = new LibreClient();

  // Setup pages
  const pages = new Pages();
  pages.add(
    new SettingsPage(client),
    new GraphPage(client),
  );

  // Start at graph or settings depending on auth
  if (client.hasAuth()) {
    pages.switch(GraphPage.identifier);
  } else {
    pages.switch(SettingsPage.identifier);
  }
};
