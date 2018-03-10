const nodeUrl = require('url');
const path = require('path');
const client = require('request-promise');
const debug = require('debug')('jason:load:http');

const REGEX_ABSOLUTE_LINK = /^https?:\/\//;

/**
 * Requests data via HTTP. Depends on the "request-promise" package.
 * @see https://github.com/request/request
 */
class HttpClient {
  /**
   * @param {Object} config The config object
   * @param {*} config.*
   * Keys prefixed with "_" will be used for the loader own configuration.
   * Other keys will be used as axios options.
   * @param {number} [config._concurrency=1] The concurrency limit when following links and/or
   * paginating.
   */
  constructor(config) {
    const httpConfig = {};
    const loaderConfig = {};

    Object.keys(config).forEach((key) => {
      if (key[0] !== '_') {
        httpConfig[key] = config[key];
      } else {
        loaderConfig[key.slice(1)] = config[key];
      }
    });
    debug(config);

    this._config = { concurrency: 1, ...loaderConfig };
    this._config.concurrency = Number(this._config.concurrency); // just in case
    this._httpConfig = httpConfig;

    this._httpClient = { request: client };

    debug('HttpClient instance created.');
    debug('loader config', this._config);
  }

  /**
   * @param {Object} [httpConfig] An optional HTTP config, used when following/paginating.
   * @return {Promise.<string>|Promise.<Error>}
   */
  async run(httpConfig) {
    Object.assign(this._httpConfig, httpConfig);

    const { method = 'get', uri: url, qs: params = '' } = this._httpConfig;

    debug('%s %s...', method.toUpperCase(), url, params);

    try {
      const response = await this._httpClient.request(this._httpConfig);

      const data = response;

      /* const {
        config,
        statusCode: status,
        statusText,
        headers,
        data,
      } = response;

      // eslint-disable-next-line no-shadow
      const { method = 'get', uri: url, qs: params = '' } = config;

      const contentLength = headers['content-length'] !== undefined ?
        headers['content-length'] :
        '?';

      debug('%s %s: %s (%d)', method.toUpperCase(), url, statusText, status, params);
      debug('%s "%s" chars received.', contentLength, headers['content-type']); */

      return data;
    } catch (requestError) {
      debug(requestError.message);
      throw requestError;
    }
  }

  /**
   * Returns the config . Used for following/paginating.
   * @return {Object}
   */
  getConfig() {
    return this._config;
  }

  /**
   * Builds a new load config. Used for following/paginating.
   * @param {string} link
   * @return {Object}
   */
  buildLoadParams({ link }) {
    const loadParams = { ...this._httpClient.defaults };

    if (link[0] === '/') {
      loadParams.url = link;
    } else if (link.match(REGEX_ABSOLUTE_LINK)) {
      loadParams.baseURL = link;
      loadParams.url = '';
    } else {
      const { pathname } = nodeUrl.parse(loadParams.url);
      loadParams.url = path.join(pathname, link);
    }

    return loadParams;
  }
}

module.exports = HttpClient;