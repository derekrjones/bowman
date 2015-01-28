var _ = require('lodash')
  , Q = require('q')

/**
 * UTILS
 */

function promisify(nParams, fn){
  if(!_.isNumber(nParams)) nParams = fn.length;

  if(fn.length > nParams){
    return Q.denodeify(fn);
  } else {
    return Q.promised(fn)
  }
}

function pcall(fn /*,...args*/){
  var args = _.rest(arguments);
  if(fn.length > args.length){
    return Q.nfapply(fn, args);
  } else {
    return Q.fapply(fn, args);
  }
}

function pFunc(x){
  return Q.delay(100).then(vFunc.bind(null, x));
}

function nFunc(x, cb){
  setTimeout(function(){
    if(x < 0){
      cb(x + ' < 0');
    }
    else {
      cb(null, 'value ' + x);
    }
  }, 100);
}

function vFunc(x){
  if(x < 0) throw new Error(x + ' < 0');
  return 'value ' + x;
}
var pass = console.log.bind(console, 'PASS')
var fail = console.error.bind(console, 'FAIL')

Q.all([
  pcall(pFunc, 1).then(pass, fail)
  , pcall(pFunc, -1).then(pass, fail)
  , pcall(nFunc, 2).then(pass, fail)
  , pcall(nFunc, -2).then(pass, fail)
  , pcall(vFunc, 3).then(pass, fail)
  , pcall(vFunc, -3).then(pass, fail)
]).then(pass, fail)

return;

var pfn = promisify(1, pFunc);
var nfn = promisify(1, nFunc);
var vfn = promisify(1, vFunc);

pfn(1).then(pass, fail)
pfn(-1).then(pass, fail)

nfn(2).then(pass, fail)
nfn(-2).then(pass, fail)

vfn(3).then(pass, fail)
vfn(-3).then(pass, fail)