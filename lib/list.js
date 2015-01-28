var fs = require('fs')
  , _ = require("lodash")
  , path = require("path")

module.exports = list;

function list(cb){

  var bower = require('bower'); // require only when needed

  bower.commands
    .list({relative: true}, {offline: true})
    .on('end', function(rep){

      /*
      var missing = _.pick(rep.dependencies,function(x){return x.missing;});
      missing = _.keys(missing);

      if(missing.length){
          rep.dependencies = _.omit(rep.dependencies,missing);
          console.error('BOWER LIST','missing components',missing);
      }
      */

      //resolveViaNpm(rep.dependencies);

      /*
       //console.log($(paths(a.dependencies)));
       var paths = asPaths(rep.dependencies);
       var unresolved = _.reduce(paths,function(res,paths,pkg){
       if(_.isEmpty(paths))res.push(pkg);
       return res;
       },[]);
       */

      cb(null, rep);
    })
    .on('error', cb);
}

function resolveViaNpm(deps){
  _.each(deps, function(pkg){
    if(_.isEmpty(pkg.pkgMeta.main)){
      try {
        var npmMeta = fs.readFileSync(path.join(pkg.canonicalDir, './package.json'));
        npmMeta = JSON.parse(npmMeta);
        var main = asArray(npmMeta.main);
        main = _.map(main, function(p){
          if(path.extname(p) == '')return p + '.js';
          return p;
        });
        pkg.pkgMeta.main = main;
      } catch(err){
      }
    }
  });
  return deps;
}

/**
 * Helpers
 */

function asArray(x){
  return _.isString(x) ? [x] : _.toArray(x);
}
