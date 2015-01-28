var path = require('path')
    , _ = require('lodash')
    , Q = require('q')
    , globMerge = require('./globMerge')

exports.tree = require('./depTree')

/**
 * UTILS
 */

/**
 * MISC
 * TODO - clean-up
 */

function getDependencies(root, comps){
    var components = [];
    while(comps.length){
        components = _.union(comps, components);

        var deps = _.pick(root.packages, comps);
        deps = _.pluck(deps, "dependencies");
        //TODO semver
        comps = _.uniq(_.flatten(_.map(deps, _.keys)));
        comps = _.difference(comps, components); //Remove circular references
    }
    return components;
}

//getComponents(['angular-bootstrap'],['ui.router']).then(getComponentFiles).then(console.log);

function getComponentFiles(components){
    components = util.asArray(components)
    return getRepo().then(_.partialRight(componentFiles, components));
}

// TODO ordered dependencies
function componentFiles(root, comps){
    var deps = getDependencies(root, comps);
    deps = _.pick(root.packages, deps);

    var files = {};
    _.each(['scripts', 'styles', 'assets'], function(fileType){
        files[fileType] = _.flatten(_.pluck(deps, fileType));
    });
    return files;
}

/**
 * ITERATING with promise/callbacks
 */

exports.pMap = pMap;
function pMap(col, fn){
    return Q.all(_.map(col, promisify(2, fn)));
}

exports.pMapValues = pMapValues;
function pMapValues(col, fn){
    var toObject = _.partial(_.object, _.keys(col));
    return pMap(col, fn).then(toObject)
}

exports.pEach = pEach;
function pEach(col, fn){
    return pMap(col, fn).thenResolve(col)
}

/**
 * BATCH PROCESSING
 */

/**
 *
 * @param root {obj}
 * @param prop {string} property name
 * @param fnOrObj {Function|object}
 *
 bow.pAssign(root,'isLatest',function(pkg,pkgName){
        return findLatest(pkgName).then(function(ver){
            return ver == pkg.version;
        }
    }); // returns promise(root);

 bow.assign(root,'main',{
        "underscore" : "./underscore.js",
        "q": "q.js",
        "scriptjs": "dist/script.js",
        "socket.io": "lib/socket.io.js"
    }) // returns root;
 *
 */
exports.pAssign = pAssign;
function pAssign(root, prop, pData){
    if(_.isFunction(pData)){
        pData =  pMapValues(root.packages, pData)
    }
    return Q.when(pData,_.partial(assign, root, prop));
}

exports.pMerge = pMerge;
function pMerge(root, prop, pData){
    if(_.isFunction(pData)){
        pData =  pMapValues(root.packages, pData)
    }
    return Q.when(pData,_.partial(merge, root, prop));
}

/*
    assign(root,'main',{
        "underscore" : "./underscore.js",
        "q": "q.js",
        "scriptjs": "dist/script.js",
        "socket.io": "lib/socket.io.js"
    }) // returns root;
 */
exports.assign = assign;
function assign(root, prop, data){
    var pkgs = root.packages;
    assignTo(pkgs, prop, data);
    return root;
}

exports.merge = merge;
function merge(root, prop, data){
    var pkgs = root.packages;
    applyToProp(pkgs, prop, data, _.merge);
    return root;
}

// like modify but with glob-merge
exports.alter = alter;
function alter(root, prop, data){
    var pkgs = root.packages;
    applyToProp(pkgs, prop, data, globMerge);
    return root;
}

/**
 * PROCESSING HELPERS
 */

function assignTo(obj, prop, src){
    src = fitTo(obj, src);
    _.each(src, function(v, k){
        obj[k][prop] = v;
    })
}

function applyToProp(obj, prop, src, fn){
    src = fitTo(obj, src)
    src = unpluck(src, prop);
    return fn(obj, src);
}

function fitTo(obj, src){
    if(_.isFunction(src)){
        return _.mapValues(obj, src);
    }
    return _.pick(src, _.keys(obj));
}

// unpluck([1, 2],'key') -> [{key: 1},{key: 2}]
// unpluck({a: 1, b: 2},'key') -> {a: {key: 1}, b: {key: 2}}
function unpluck(data, prop){
    var mapFn = _.isArray(data) ? _.map : _.mapValues
    return mapFn(data, function(d){
        var o = {};
        o[prop] = d;
        return o;
    });
}

/**
 * PATHING
 */

// path to package or packaged file
exports.pathTo = pathTo;
function pathTo(root, pkg, file){

    var base = path.resolve(root.base);

    if(_.isString(pkg))pkg = root.packages[pkg];

    if(pkg && pkg.base){
        base = path.join(base, pkg.base);
        if(file){
            base = path.join(base, file);
        }
    }
    return base;
}

/*
fullPaths(root,'bootstrap') -> ['bootstrap.js','bootstrap.css']
fullPaths(root,'bootstrap','scripts') -> ['bootstrap.js']
fullPaths(root,'bootstrap',['scripts','styles']) -> {'scripts': [..],'styles': [..]}

fullPaths(root) -> {'bootstrap': [..], ...}
fullPaths(root, null, 'scripts') -> same, but for scripts
fullPaths(root, null, ['scripts','styles']) -> ... {'bootstrap': {'scripts': [..],'styles': [..]}, ...}
*/
exports.fullPaths = fullPaths;
function fullPaths(root, pkgs, props){
    var depth = 0;
    if(_.isString(pkgs))depth++;
    if(!_.isArray(props))depth++;

    pkgs = pkgs ? _.pick(root.packages, pkgs) : root.packages;
    props = asArray(props || 'main');

    var res = _.mapValues(pkgs, function(pkg){
        var values = packagePaths(root, pkg, props);
        return (values.length == 1) ? values[0] : _.object(props, values);
    });

    return unnest(res, depth);
}

/**
 *
 * @param root object
 * @param {pkgs=all} string|string[]
 * @param {props='main'} string|string[]
 * @returns collection of paths
 */
exports.flatPaths = flatPaths;
function flatPaths(root, pkgs, props){
    pkgs = pkgs ? _.pick(root.packages, pkgs) : root.packages;
    props = asArray(props || 'main');

    // [pkgs[props[paths]]]
    var res = _.map(pkgs, function(pkg){
        return packagePaths(root, pkg, props);
    });

    // [props[paths]] Note: Zip should do nothing if length is 1 but instead zips the first element
    res = _.size(res)<=1 ? (res[0] || [[]])
        : _.zip.apply(_, res);

    res = _.map(res, _.flatten);

    res = _.object(props, res);

    return unnest(res);
}

function packagePaths(root, pkg, props){
    var base = pathTo(root, pkg);
    return _.map(props, function(prop){
        var files = asArray(pkg[prop])
        return _.map(files, function(file){
            return normalizePath(path.join(base, file));
        });
    });
}

/**
 * PROMISES
 */

// NOTE: must include exact number of arguments
exports.pcall = pcall;
function pcall(fn /*,...args*/){
    var args = _.rest(arguments);
    return papply(fn, args);
}

exports.papply = papply;
function papply(fn, args){
    if(fn.length > args.length){
        return Q.nfapply(fn, args);
    } else {
        return Q.fapply(fn, args);
    }
}

/*
- binds a function always return a promise
f1 = function(a,b,callback){...};
f2 = function(a,b){...}; // returns promise or val
fn = Math.random() > 0.5 ? f1 : f2;
f = promisify(2,fn); // f always returns promise
IMPORTANT: fn must not be bound or wrapped
 */
exports.promisify = promisify; // use pcall, papply instead
function promisify(nParams, fn){
    if(fn.length > nParams){
        return Q.denodeify(fn);
    } else {
        return Q.promised(fn);
    }
}

/**
 * HELPERS
 */

exports.asArray = asArray;
function asArray(x){
    return _.isString(x) ? [x] : _.toArray(x);
}

// returns unix-style path
exports.normalizePath = normalizePath;
function normalizePath(src, relTo){
    if(relTo)src = path.relative(relTo, src);
    return src.replace(/\\/g, '/');
}

// returns the path of a file relative to the first
exports.pathFrom = pathFrom;
function pathFrom(srcFile, relFile){
    return path.join(path.dirname(srcFile), relFile);
}

// {a:{b:{c:[1,2]}}} -> [1,2];
function unnest(obj, maxDepth){
    maxDepth = maxDepth || -1;
    while(maxDepth-- && _.isPlainObject(obj) && _.size(obj) == 1)obj = _.values(obj)[0];
    return obj;
}

exports.quote = quote;
function quote(s){
    return '"' + s + '"';
}