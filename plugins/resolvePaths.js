var path = require('path')
    , _ = require('lodash')
    , glob = require('glob')

var PLUGIN_NAME = "RESOLVE-PATHS";

module.exports = function(bow){
    bow.assign('main',function(pkg, pkgName){

        var base = bow.pathTo(pkgName);
        var files = bow.main(pkgName);

        files = _.reduce(files, function(acc, file){
            // support globs
            var res = glob.sync(file);

            if(res.length){
                acc = acc.concat(res);
            } else {
                console.warn(PLUGIN_NAME, 'file not found', bow.util.quote(file));
            }

            return acc;
        }, []);

        // relative paths
        files = _.map(files, function(file){
            return bow.util.normalizePath(file, base);
        });

        //console.log(['resolvePaths', JSON.stringify(pkg.main),JSON.stringify(files)].join("\n"));

        return files;
    });
}