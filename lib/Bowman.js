var _ = require('lodash')
  , util = require('./util')
  , asArray = util.asArray
  , FILE_GROUPS = _.keys(require('../plugins/componentize').GROUPS)

module.exports = Bowman;

function Bowman(root){
  if(!(this instanceof Bowman)) return new Bowman(root);
  this.root = root;
  this.config = root.config || {}; //TODO FIX
  this._selected = [];
  this._ignored = [];
  this._components = [];
  this.util = util;
}

_.extend(Bowman.prototype, {
  init: function(){
    this.clear();
    this._tree = util.tree(this.root);
    this.select();
    return this;
  },
  clear: function(){
    this._selected = [];
    this._ignored = [];
    this._components = [];
  },
  /**
   * MANAGING COMPONENTS
   */
  select: function(pkgs){
    if(!this._tree) throw new Error("Bowman was not initialized");
    pkgs = pkgs || this.default();
    this._selected = asArray(pkgs);
    this.setComponents(this._tree.resolve(this._selected));
    return this;
  },
  selectAll: function(){
    return this.select(this.available());
  },
  selected: function(){
    return this._selected;
  },
  add: function(pkgs){
    pkgs = asArray(pkgs); // so we don't accidentally select all if no args
    pkgs = _.union(this._selected, pkgs);
    return this.select(pkgs);
  },
  remove: function(pkgs){
    pkgs = asArray(pkgs);
    pkgs = _.difference(this._selected, pkgs);
    return this.select(pkgs);
  },
  unselect: function(pkgs){
    pkgs = asArray(pkgs);
    return (pkgs.length) ? this.remove(pkgs) : this.select([])
  },
  implied: function(){
    return _.difference(this.components(), this.selected());
  },
  /**
   * MANUAL SETTING COMPONENTS
   */
  // get all required components ordered (excluding ignored)
  components: function(){
    if(!this._tree) throw new Error("Bowman was not initialized");
    return _.difference(this._components, this._ignored);
  },
  // typically internal use only
  setComponents: function(pkgs){
    this._components = asArray(pkgs);
    return this;
  },
  /**
   * IGNORING COMPONENTS
   */
  ignore: function(pkgs){
    pkgs = asArray(pkgs);
    this._ignored = _.union(this._ignored, pkgs);
    return this;
  },
  unignore: function(pkgs){
    this._ignored = pkgs ? _.difference(this._ignored, asArray(pkgs)) : [];
    return this;
  },
  ignored: function(){
    return _.intersection(this._components, this._ignored);
  },
  /**
   * ROOT
   */
  name: function(){
    return this.root.name;
  },
  version: function(){
    return this.root.version;
  },
  dependencies: function(){
    return this.root.dependencies;
  },
  default: function(){
    return _.keys(this.root.dependencies);
  },
  available: function(){
    return _.keys(this.root.packages);
  },

  /**
   * PACKAGES
   */
  package: function(pkgName){
    return this.root.packages[pkgName]
  },
  packages: function(pkgs){
    pkgs = pkgs || this.components();
    return _.pick(this.root.packages, pkgs);
  },
  all: function(){
    return this.root.packages;
  },

  /**
   * PROPS
   */
  prop: function(propName, pkgs){
    pkgs = this.packages(pkgs);
    return _.mapValues(pkgs, propName);
  },
  /**
   * FILES and DIRECTORIES
   */
  pathTo: function(pkg, file){
    return util.pathTo(this.root, pkg, file)
  },
  // (by [props])
  paths: flatPaths,
  main: _.partial(flatPaths, 'main'),
  scripts: _.partial(flatPaths, 'scripts'),
  styles: _.partial(flatPaths, 'styles'),
  fonts: _.partial(flatPaths, 'fonts'),
  images: _.partial(flatPaths, 'images'),
  templates: _.partial(flatPaths, 'templates'),
  //json: _.partial(flatPaths,'json'),

  //  (by [pkgs] then [props])
  pathsTree: fullPaths,
  mainTree: _.partial(fullPaths, 'main'),
  scriptsTree: _.partial(fullPaths, 'scripts'),
  stylesTree: _.partial(fullPaths, 'styles'),
  filesTree: _.partial(fullPaths, FILE_GROUPS),

  /**
   * EDITING
   */

  /**
   * PROMISED
   * - each
   * - update
   * - annotate
   * @param fn - fn(pkg,pkgName,[cb]), async use callback or return a promise. sync just return value
   * @return a promise (which can be ignored if using sync functions)
   */
  pAssign: function(prop, pData){
    return util.pAssign(this.root, prop, pData);
  },
  pMerge: function(prop, pData){
    return util.pMerge(this.root, prop, pData);
  },
  assign: function(prop, data){
    util.assign(this.root, prop, data);
    return this;
  },
  merge: function(prop, data){
    util.merge(this.root, prop, data);
    return this;
  },
  alter: function(prop, data){
    util.alter(this.root, prop, data);
    return this;
  },
  /**
   * ITERATORS
   */
  pEach: function(fn){
    return util.pEach(this.root.packages, fn)
      .thenResolve(this)
  },
  pMap: function(fn){
    return util.pMap(this.root.packages, fn)
  },
  pMapValues: function(fn){
    return util.pMapValues(this.root.packages, fn)
  },
  each: function(fn){
    _.each(this.root.packages, fn);
    return this;
  },
  map: function(fn){
    return _.map(this.root.packages, fn);
  },
  mapValues: function(fn){
    return _.mapValues(this.root.packages, fn)
  },
});

// bindToPackages(_.map)
function bindToPackages(fn, returnThis){
  return function(){
    var args = _.toArray(arguments).unshift(this.root.packages);
    var res = fn.apply(this, args);
    return returnThis ? this : res;
  }
}

function fullPaths(props, pkgs){
  props = props || FILE_GROUPS;
  pkgs = pkgs || this.components();
  return util.fullPaths(this.root, pkgs, props)
}

function flatPaths(props, pkgs){
  props = props || FILE_GROUPS;
  pkgs = pkgs || this.components();
  return util.flatPaths(this.root, pkgs, props)
}

