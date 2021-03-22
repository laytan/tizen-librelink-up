export default class LibreRequestError extends Error {
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
