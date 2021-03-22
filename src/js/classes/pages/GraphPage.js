import Graph from '../Graph';
import LibreClient from '../LibreClient';
import Page from './Page';
import SettingsPage from './SettingsPage';

export default class GraphPage extends Page {
  /**
   * @type {string}
   * @readonly
   */
  static identifier = 'graph';

  /**
   * @type {LibreClient}
   */
  #libreClient;

  /**
   * @type {Graph}
   */
  #graph;

  /**
   * @param {LibreClient} libreClient
   */
  constructor(libreClient) {
    super(GraphPage.identifier);

    this.#libreClient = libreClient;
    this.#graph = new Graph('graph');
  }

  /**
   * @inheritdoc
   * @returns {undefined|string}
   */
  show() {
    // Return SettingsPage when we do not have auth
    if (!this.#libreClient.hasAuth()) {
      return SettingsPage.identifier;
    }

    super.show();

    this.loadGraph();
  }

  /**
   * Load the graph
   */
  async loadGraph() {
    try {
      await this.#libreClient.getConnections();

      this.#graph.clear();
      this.#graph.show(this.#libreClient.connections[0].graph, this.#libreClient.connections[0].patient.firstName);
    } catch(e) {
      console.error(e);
    }
  }
}
