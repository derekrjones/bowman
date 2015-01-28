var fs = require('fs')
  , path = require("path")
  , _ = require("lodash")
  , Q = require('q')
  , findup = require('findup-sync')
  , util = require('./lib/util')
  , list = require('./lib/list')
  , githubId = require('./lib/githubId')
  , Bowman = require('./lib/Bowman')

var MODULE_NAME = "BOWMAN";

var bowman = module.exports = start;
bowman.start = start;
bowman.init = init;
bowman.util = util;
bowman.Bowman = Bowman;

/*
OPTS
update: false,
cwd: '.',
 */
function start(opts, cb){
  if(arguments.length == 1 && _.isFunction(opts)){
    cb = opts;
    opts = null;
  }
  return init(opts).nodeify(cb)
}

function init(opts, cb){
  if(arguments.length == 1 && _.isFunction(opts)){
    cb = opts;
    opts = null;
  }
  else if(opts === true){
    opts = {
      update: true
    }
  }

  var config = configure(loadConfig(opts))

  return (config.update ? build : load)(config)
    .post('init')
    .then(function(bow){
      // set the actual base path
      bow.config = config; //TODO ummm? this is not right
      bow.root.base = config.base;
      return bow;
    })
    .nodeify(cb)
}

/**
 * BUILD
 */

function load(config){
  return Q.nfcall(fs.readFile, config.path)
    .then(JSON.parse)
    .then(Bowman)
    .fail(_.partial(build, config))
}

function build(config){
  return Q.nfcall(list)
    .then(_.partialRight(buildRoot, config))
    .then(Bowman)
    .then(internalPlugins(['modifiers', 'resolvePaths', 'scanner', 'componentize']))
    //.then(internalPlugins(['modifiers', 'resolvePaths',/*'scanner',*/ 'componentize']))
    .post('init')
    .then(applyPlugins)
    .then(packagesToSpec)
    .then(_.partialRight(save, config.path))
    .fail(function(err){
      console.error(MODULE_NAME, 'BUILD FAILED', err.stack);
      return {};
    });
}

function buildRoot(res, config){
  var root = {
    name: res.pkgMeta.name,
    base: config.base, //res.canonicalDir, // not saved
    dependencies: res.pkgMeta.dependencies || {},
    config: config, // base, path not saved
    missing: [],
    extraneous: {},
    unknown: {},
    incompatible: {}
  };

  if(config.plugins){
    var pluginConfigs = _.pick(res.pkgMeta, config.plugins)
    _.extend(root, pluginConfigs);
  }

  var knownPkgs = _.keys(res.dependencies);
  var missing = root.missing,
    extraneous = root.extraneous,
    unknown = root.unknown,
    incompatible = root.incompatible;

  var packages = _.map(res.dependencies || {}, function(pkg, pkgName){
    if(pkg.missing){
      missing.push(pkgName);
      return null;
    }

    var meta = pkg.pkgMeta;
    var cfg = _.pick(meta, bowman.PACKAGE_SPEC);
    cfg.endpoint = pkg.endpoint.name; // not always same as name
    cfg.repository = githubId(meta._source); //"git://github.com/user/package.git" -> "user/package"
    cfg.base = util.normalizePath(pkg.canonicalDir); // bower_components/angular
    cfg.main = util.asArray(cfg.main)
    cfg.authors = util.asArray(meta.authors || meta.author);
    cfg.licenses = util.asArray(meta.licenses || meta.license);

    // normalize files
    cfg.main = _.map(cfg.main, function(file){
      return util.normalizePath(file, './')
    });

    if(pkg.extraneous){
      extraneous[pkgName] = cfg.version || "*";
    }

    // check the dependencies
    _.each(pkg.dependencies, function(dep, depName){
      if(dep.missing){
        missing.push(depName);
      }
      else if(!_.contains(knownPkgs, depName)){
        unknown[depName] = dep.pkgMeta.version || "*";
      }

      if(dep.incompatible){
        var target = dep.endpoint.target
        var version = dep.pkgMeta.version

        var inc = incompatible[pkgName] = incompatible[pkgName] || {};
        inc[depName] = {target: target, version: version};
      }
    });

    return cfg;
  });

  if(_.size(missing)){
    missing = root.missing = _.uniq(missing.sort(), true);

    root.dependencies = _.omit(root.dependencies, missing);

    console.warn(['MISSING COMPONENTS'
      , JSON.stringify(missing)
      , '-- should be reinstalled'].join("\n"));
  }

  if(_.size(extraneous)){
    // bower adds extraneous to dependencies, remove them ( we can still find all packages by _.keys(root.packages) )
    root.dependencies = _.omit(root.dependencies, _.keys(extraneous));

    console.warn(['EXTRANEOUS COMPONENTS'
      , JSON.stringify(extraneous, null, 2)
      , '-- consider adding theses to your bower.json'].join("\n"));
  }

  if(_.size(unknown)){
    // TODO jquery not getting added
    console.warn(['DISCOVERED COMPONENTS'
      , JSON.stringify(unknown, null, 2)
      , '-- likely caused because the component...'
      , ' - has a missing/invalid bower.json'
      , ' - was not declared as a dependency in the main bower.json'
      , ' - is a dependency of another component'
      , '?It has been added'].join("\n"));
  }

  if(_.size(incompatible)){
    console.warn(['INCOMPATIBLE COMPONENTS'
      , JSON.stringify(incompatible, null, 2)
      , '-- performance problems possible'].join("\n"));
  }

  packages = _.compact(packages);
  root.packages = _.indexBy(packages, 'endpoint');
  return root;
}

/**
 * SPEC
 */

bowman.PACKAGE_SPEC = "endpoint name repository version private description homepage authors licenses dependencies base main ignore keywords bowman".split(" ")

bowman.packagesToSpec = packagesToSpec;
function packagesToSpec(bow){
  var root = bow.root;
  root.packages = _.mapValues(root.packages, alignToSpec);
  return bow;
}

bowman.alignToSpec = alignToSpec;
function alignToSpec(pkg){
  var pkgKeys = _.keys(pkg);
  var keys = _.intersection(bowman.PACKAGE_SPEC, pkgKeys);
  keys = _.union(keys, pkgKeys);
  return _.pick(pkg, keys);
}

/**
 * PLUGINS
 */

function internalPlugins(plugins){
  plugins = _.map(plugins, function(p){
    return util.normalizePath(path.resolve(path.join(__dirname, '/plugins/' + p)));
  })
  return _.partialRight(applyPlugins, plugins)
}

function applyPlugins(bow, plugins){

  plugins = plugins || bow.config.plugins || [];

  var promise = Q(bow);
  _.each(plugins, function(pluginName){
    var outName = util.quote(pluginName.split('/').pop().toUpperCase());
    promise = promise
      .then(function(){
        console.log('PLUGIN', outName);
        return applyPlugin(bow, pluginName);
      })
      .fail(function(err){
        console.error('PLUGIN', outName, 'FAILED', err.stack);
      });
  });
  return promise
    .thenResolve(bow)
}

function applyPlugin(bow, pluginName){

  var plugin, trans;

  try {
    plugin = (pluginName.charAt(0) == '.')
      ? require(path.resolve(pluginName))
      : require(pluginName)
  }
  catch(err){
    throw new Error('plugin "' + pluginName + '" not found from '+path.resolve("./"));
  }

  trans = plugin._transform || plugin;

  if(!_.isFunction(trans)){
    throw new Error('expected plugin/transform to be a function');
  }

  pluginName = pluginName.split('/').pop();

  var opts = bow.config[pluginName] || {};

  //console.log('OPTIONS',pluginName,opts);

  return transform(bow, trans, opts);
}

function transform(bow, transFn, opts){
  return util.pcall(transFn, bow, opts);
}

/**
 * I/O and Configuration
 */

  // Object or cwd
function configure(opts){
  if(opts.debug){
    console.log(MODULE_NAME, 'DEBUG MODE');
    Q.longStackSupport = true;
  }
  return opts;
}

function loadConfig(opts){
  var fPath = findup('bower.json', opts && {cwd: opts.cwd});
  if(!fPath) throw new Error("bower.json not found");

  var basePath = path.dirname(fPath);

  var config = require(fPath).bowman || {};

  if(_.isString(config)){
    fPath = util.pathFrom(fPath, config);
    config = require(fPath);
  }

  if(opts)_.defaults(config, opts)

  config.file = config.file || '.bowman.json'; // relative to bower.json
  config.base = basePath; // dir of bower.json and bower_components
  config.path = util.pathFrom(fPath, config.file); // path to .bowman.json

  return config;
}

function save(bow, configPath){
  var json = encode(bow);

  return Q.nfcall(fs.writeFile, configPath, json)
    .then(function(){
      console.log(MODULE_NAME, "SAVED", util.quote(configPath));
      return bow;
    });
}

function encode(bow){

  var res = bow.root;

  // remove base before encoding for portability
  var base = res.config.base
    , path = res.config.path;

  delete res.base;
  delete res.config.base;
  delete res.config.path;

  var json = JSON.stringify(res, null, 2)

  res.config.base = res.base = base;
  res.config.path = path;

  return json;
}