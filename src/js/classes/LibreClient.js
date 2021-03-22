import LibreRequestError from './errors/LibreRequestError';
import NotAuthenticatedError from './errors/NotAuthenticatedError';

export default class LibreClient {
  /**
   * Bearer Auth token
   *
   * @type {string}
   */
  #authToken;

  /**
   * @typedef Connection
   * @property {Patient} patient
   * @property {Array<GraphDataPoint>} graph 
   */

  /**
   * @typedef {ConnectionRes} Patient
   */

  /**
   * Connections
   * 
   * @type {Array<Connection>}
   */
  connections;

  /**
   * Base URL for the LibreView API
   *
   * @type {string}
   */
  static APIURL = 'https://api-eu.libreview.io';

  /**
   * @typedef Endpoint
   * @property {'GET'|'POST'} method Request method
   * @property {string} path Request path
   */

  /**
   * @type {Object.<string, Endpoint|function>}
   * @readonly
   */
  static ENDPOINTS = {
    AUTH: {
      method: 'POST',
      path: '/llu/auth/login',
    },
    CONNECTIONS: {
      method: 'GET',
      path: '/llu/connections',
    },
    GRAPH: /** @param {string} patientId @returns {Endpoint} */ (patientId) => ({
      method: 'GET',
      path: `/llu/connections/${patientId}/graph`,
    }),
  };

  constructor() {
    this.#authToken = localStorage.getItem('LIBRE_AUTH_TOKEN');
    console.log(this.#authToken);
  }

  /**
   * Wether we have an auth token to use
   *
   * @returns {boolean}
   */
  hasAuth() {
    return (this.#authToken?.length ?? 0) > 0;
  }

  /**
   * @typedef ConnectionsResponse
   * @property {string|undefined} message
   * @property {Array<ConnectionRes>|undefined} data
   */

  /**
   * @typedef ConnectionRes
   * @property {string} patientId
   * @property {string} firstName
   * @property {string} lastName
   */

  /**
   * @typedef GraphRes
   * @property {Object} data
   * @property {ConnectionRes} data.connection
   * @property {Array<GraphDataPoint>} data.graphData
   */
  
  /**
   * @typedef GraphDataPoint
   * @property {string} Timestamp Format: m/dd/yyyy h:m:s PM/AM
   * @property {number} Value
   */

  /**
   * Populate connections property with the connections of the authorized user
   *
   * @returns {Promise<void>}
   */
  async getConnections() {
    this.connections = [];
    
    if (!this.hasAuth()) {
      return;
    }

    try {  
      // Retrieve all connections
      /** @type {ConnectionsResponse} */
      const connectionsRes = await this._request(LibreClient.ENDPOINTS.CONNECTIONS);
      console.log(`Keys: ${Object.keys(connectionsRes).join(', ')}`);
      if (!connectionsRes.data) {
        throw new Error(connectionsRes.message ?? '');
      }

      console.log(`${connectionsRes.data?.length} connections`);
      // Retrieve detailed data for each connection and add to our connections property
      this.connections = await Promise.all(connectionsRes.data.map(async connection => {
        /** @type {GraphRes} */
        const graphRes = await this._request(LibreClient.ENDPOINTS.GRAPH(connection.patientId));
        console.log(`graph response for ${graphRes.data.connection.firstName}`);
        return {
          graph: graphRes.data.graphData,
          patient: graphRes.data.connection,
        };
      }));
    } catch(e) {
      console.error(e.message ?? e ?? 'Er ging iets fout bij het ophalen van connecties');
    }
  }

  /**
   * @typedef AuthResponse
   * @property {Object} data
   * @property {Object} data.authTicket
   * @property {string} data.authTicket.token
   * @property {number} data.authTicket.expires
   * @property {number} data.authTicket.duration
   */

  /**
   * Tries authorizing against libreview API
   * Sets #authToken if successfull
   *
   * @param {string} email Users Email
   * @param {string} password Users Password
   *
   * @returns {Promise<string?>} String would mean an error
   */
  async auth(email, password) {
    try {
      /** @type {AuthResponse} */
      const res = await this._request(LibreClient.ENDPOINTS.AUTH, { email, password });
      this.#authToken = res.data.authTicket.token;
      localStorage.setItem('LIBRE_AUTH_TOKEN', this.#authToken);
    } catch(e) {
      if (e instanceof NotAuthenticatedError) {
        console.log('Incorrect auth');
        return 'Incorrect email and password combination';
      }

      if (e instanceof LibreRequestError) {
        console.log(`libre error ${e.statusCode}`);
        console.log(e.response);
      }

      const errMsg = e?.message ?? e ?? 'Something went wrong trying to authenticate';
      console.log(errMsg);
      return errMsg;
    }
  }

  /**
   * Send a request against the LibreView API
   *
   * @param {Endpoint} endpoint Endpoint to hit 
   * @param {Object|null} data Optional data for the request
   * 
   * @returns {Promise<any>} The JSON response
   * @throws {LibreRequestError}
   */
  _request(endpoint, data) {
    return new Promise((resolve, reject) => {
      const client = new XMLHttpRequest();
      console.log(endpoint.method + `${LibreClient.APIURL}${endpoint.path}`);
      client.open(endpoint.method, `${LibreClient.APIURL}${endpoint.path}`);
      client.responseType = 'json';

      // Required headers
      client.setRequestHeader('product', 'llu.android');
      client.setRequestHeader('version', '4.0.0');

      // Use authtoken if we are authenticated
      if (this.hasAuth()) {
        client.setRequestHeader('Authorization', `Bearer ${this.#authToken}`);
      }

      client.onload = () => {
        // Catch specific errors
        if (client.response.error === 'notAuthenticated') {
          return reject(new NotAuthenticatedError());
        }

        resolve(client.response);
      }

      client.onerror = () => {
        reject(new LibreRequestError(client.statusCode, client.response));
      }

      if (endpoint.method === 'POST' && data !== undefined) {
        client.setRequestHeader('Content-Type', 'application/json');
        client.send(JSON.stringify(data));
      } else {
        client.send();
      }
    });
  }
}
