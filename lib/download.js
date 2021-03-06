var mozget = require('firefox-get'),
    tmp = require('tmp'),
    fs = require('fs'),
    http = require('http'),
    debug = require('debug')('mozilla-runner:download'),
    detectOS = require('./detectos'),
    extract = require('./extract');

var DEFAULT_VERSION = 'nightly';

/**
 * Downloads a mozilla product to a given path.
 *
 *    runner.download('firefox', path, function(err) {
 *      // do amazing things!
 *    });
 *
 * Options:
 *    - os: to download for (see firefox-get)
 *    - version: or channel (like 18 or 'nightly')
 *    - strict: send an error if given path exists.
 *
 * @param {String} product to download (like firefox)
 * @param {String} path to download file to.
 * @param {Object} [options] optional set of configuration options.
 * @param {Function} callback [err, path];
 */
function download(product, path, options, callback) {
  var os = options.os || detectOS(product);
  var version = options.version || DEFAULT_VERSION;

  debug('download', product, os, version);

  function saveToTemp(err, url) {
    if (err) return callback(err);
    debug('got ftp download location', url);

    tmp.file({ prefix: product + '-' + os }, function(err, tmpPath) {
      if (err) return callback(err);
      debug('open temp stream', tmpPath);
      var stream = fs.createWriteStream(tmpPath);
      http.get(url, function(res) {
        debug('opened http connection downloading...', path);
        res.pipe(stream);
        var i = 0;
        stream.on('close', function() {
          debug('done downloading extract', url, tmpPath, path);
          extract(product, url, tmpPath, path, callback);
        });
      });
    });
  }

  mozget[product](version, { os: os }, saveToTemp);
}

function checkDownload(product, path, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = null;
  }

  options = options || {};

  var strictErrors = options && options.strict;

  // don't clobber an existing path
  fs.exists(path, function(itDoes) {

    // bail immediately if path is filled
    if (itDoes) {
      // unless strict is on we simply return the given path assuming it works.
      if (!strictErrors) return callback(null, path);

      // in other cases the caller might want an error.
      return callback(
        new Error('cannot clobber existing path with download: "' + path + '"')
      );
    }

    // if path does not exist continue with normal download process.
    download(product, path, options, callback);
  });
}

module.exports = checkDownload;
