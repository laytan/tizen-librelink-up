import "regenerator-runtime/runtime.js";

window.onload = () => {
  document.addEventListener("tizenhwkey", (e) => {
    if (e.keyName === "back") {
      try {
        tizen.application.getCurrentApplication().exit();
      } catch (ignore) {}
    }
  });

  const client = new LibreClient();
  loadGraph(client);

  const toSettings = document.getElementById('to-settings');
  toSettings.addEventListener('click', () => {
    showPage('settings');
  });

  const toGraph = document.getElementById('to-graph');
  toGraph.addEventListener('click', () => {
    showPage('graph');
    loadGraph(client);
  });

  const loginBtn = document.getElementById('login');
  loginBtn.addEventListener('click', async () => {
    const errEl = document.getElementById('login-error');
    errEl.style.display = 'none';
    const loggedInEl = document.getElementById('logged-in');
    loggedInEl.style.display = 'none';

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    const maybeErr = await client.auth(email, password);
    if (maybeErr?.length) {
      errEl.textContent = maybeErr;
      errEl.style.display = 'block';
      return;
    }

    loggedInEl.style.display = 'block';
  });
};

/**
 * Shows the given page and hides all others
 *
 * @param {string} page Page id
 */
function showPage(page) {
  const pageEl = document.getElementById(`page-${page}`);
  const pages = document.querySelectorAll('.page');
  pages.forEach(page => { page.style.display = 'none'; });
  pageEl.style.display = 'block';
}

/**
 * @param {LibreClient} libre
 */
async function loadGraph(libre) {
  if (!libre.hasAuth()) {
    showPage('settings');
    return;
  }

  try {
    await libre.getConnections();
    
    const g = new Graph('graph');
    g.show(libre.connections[0].graph, libre.connections[0].patient.firstName);
  } catch(e) {
    console.error(e);
  }
}

class Graph {
  /**
   * @type {SVGElement}
   */
  svgEl;

  /**
   * Multiplies the amount of radius offset for more movement
   */
  movementMultiplier = 10;

  /**
   * What radius to anchor the line and start offset calculations
   */
  baseLineRadius = 120;
  
  /**
   * The line's value when it is at the baseLineRadius
   */
  baseLineValue = 6.5;

  /**
   * Controls the amount of points to draw
   */
  smoothness = .1;

  constructor(svgId) {
    this.svgEl = document.getElementById(svgId);
  }

  /**
   * Creates a path element circle
   * used because tizen does not support textPath on circles
   * 
   * @param {number} r Radius
   * @param {string} id Element ID
   * @param {string} color Border color
   * @returns {string}
   */
  circleAsPath(r, id, color) {
    return /*html*/`
      <path
        fill="none"
        stroke="${color}"
        id="${id}"
        d="
        M 180 180
        m ${-r}, 0
        a ${r},${r} 0 1,1 ${r * 2},0
        a ${r},${r} 0 1,1 ${-(r * 2)},0
        "
      />
    `;
  }

  showCircle(radius, id, color, value) {
    this.svgEl.innerHTML += this.circleAsPath(radius, id, color);
    this.showText(color, id, Math.round(value * 10) / 10, '50%');
  }

  /**
   * Draws text around a path
   *
   * @param {string} color Text color
   * @param {string} aroundId ID of the element to draw against (without #)
   * @param {string} text Text to draw
   * @param {string} startOffset How far on the path to begin drawing
   */
  showText(color, aroundId, text, startOffset = '0%') {
    this.svgEl.innerHTML += /*html*/`
      <text text-anchor="middle" fill="${color}">
        <textPath startOffset="${startOffset}" href="#${aroundId}">${text}</textPath>
      </text>
    `;
  }

  /**
   * @param {Array<GraphDataPoint>} points
   */
  show(points, name) {
    const maxValue = points.reduce((aggr, curr) => curr.Value > aggr ? curr.Value : aggr, 0);
    const minValue = points.reduce((aggr, curr) => curr.Value < aggr ? curr.Value : aggr, 999999);

    // Set the average of these points as the baseline
    this.baseLineValue = points.reduce((aggr, curr) => aggr + curr.Value, 0) / points.length;
    
    // Set the maximum base line radius we can without overflowing by subtracting the max value of the circle radius
    this.baseLineRadius = 150 - ((maxValue - this.baseLineValue) * this.movementMultiplier);

    const valueToRadius = (v) => this.baseLineRadius + ((v - this.baseLineValue) * this.movementMultiplier);

    this.showCircle(this.baseLineRadius, 'baseline', 'white', this.baseLineValue);
    this.showCircle(valueToRadius(maxValue), 'max', 'white', maxValue);
    this.showCircle(valueToRadius(minValue), 'min', 'white', minValue);

    let currPoint = 0;
    const linePoints = [];
    const pointsAmt = ((2 * Math.PI) / .1);
    for (let i = 0; i <= 2 * Math.PI; i += .1) {
      const index = Math.floor((points.length / pointsAmt) * currPoint);
      const r = valueToRadius(points[index].Value);
      linePoints.push({
          x: 180 + r * Math.cos(i),
          y: 180 + r * Math.sin(i),
      });
      currPoint++;
    }
    
    const pointsAttr = linePoints.reduce((aggr, curr) => {
      return aggr + `${curr.x},${curr.y} `;
    }, 'M');

    document.getElementById('line').setAttribute('d', pointsAttr);
    this.showText('white', 'line', name, '15%');
  }
}

class LibreClient {
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

class NotAuthenticatedError extends Error {
  constructor() {
    super('Not authenticated');
  }
}

class LibreRequestError extends Error {
  /** @type {number} */
  statusCode;

  /** @type {Object} */
  response;

  /**
   * @param {number} statusCode
   * @param {Object} response
   */
  constructor(statusCode, response) {
    super();
    this.statusCode = statusCode;
    this.response = response;
  }
}
