var fs = require('fs')
  , path = require('path')
  , _ = require("lodash")
  , Q = require("q")

var PLUGIN_NAME = 'BOWMAN-SCANNER';

/**
 * TRANSFORM
 */

// Default regex to allow for single and double quotes
var RE_RESOURCE = /(?:url\(["']?(.*?)['"]?\)|src=["'](.*?)['"]|src=([^\s\>]+)(?:\>|\s)|href=["'](.*?)['"]|href=([^\s\>]+)(?:\>|\s))/g;
var RE_DATA_URI = /^data:([\w\/\.\-]+?);(\w+?),(.*?)$/g;
var RE_ABS_URL = /^(?:[a-z]+:)?\/\//i;
var RE_CSS = /\.css$/;

module.exports = function(bow, opts){

  var util = bow.util;

  return bow.pAssign('main', function(pkg, pkgName){

    var base = bow.pathTo(pkgName);
    var files = bow.main(pkgName);

    // TODO recursive search
    var parsedFiles = _.map(files, function(file){

      var relPath = util.normalizePath(file, base);

      if(!RE_CSS.test(relPath))return relPath;

      return Q.nfcall(fs.readFile, file)
        .then(function(contents){
          return parseUrls(contents, relPath);
        }, function(err){
          err = (err.code == 'ENOENT') ? ('file not found: ' + err.path) : err;
          console.error(PLUGIN_NAME, err);
          return [];
        })
    });

    return Q
      .all(parsedFiles)
      .then(function(assets){
        assets = _.chain(assets).flatten().uniq().value();

        if(opts.verbose && files.length != assets.length){
          var additions = _.difference(assets, bow.package(pkgName).main);
          console.log(PLUGIN_NAME, 'added', pkgName, additions);
        }
        return assets;
      });
  })

  function parseUrls(contents, file){
    var urls = [file];
    var match;
    while(match = RE_RESOURCE.exec(contents)){
      var metaUrl = filterMatch(match);

      if(RE_DATA_URI.test(metaUrl))continue;

      if(RE_ABS_URL.test(metaUrl)){
        if(opts.verbose)console.log(PLUGIN_NAME, 'external resource', file, metaUrl)
        continue;
      }

      var url = metaUrl.replace(/[\#\?].*/, '');
      var meta = metaUrl.substring(url.length);

      url = util.pathFrom(file, url);
      url = util.normalizePath(url);
      urls.push(url);
    }
    return urls;
  }
}

/**
 * Helpers
 */

  // [o1,o2,o3...] -> o
function flattenObjects(arr){
  arr = asArray(arr);
  arr.unshift({});
  return _.merge.apply(_, arr);
}

function asArray(x){
  return _.isString(x) ? [x] : _.toArray(x);
}

// returns the first sub-match of a match
function filterMatch(m){
  return _.find(_.rest(m));
}