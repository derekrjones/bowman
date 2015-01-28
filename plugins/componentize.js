var path = require("path")
    , _ = require("lodash")

var PLUGIN_NAME = "COMPONENTIZE";

componentize.GROUPS = {
    "scripts": [".js"],
    "styles": [".css"],
    "fonts": [".woff", ".ttf", ".otf", ".eot", ".svg"],
    "images": [".png", ".jpg", ".jpeg", ".gif"],
    "json": [".json"],
    "templates": [".html"],
    "files": [] // unmatched
};

module.exports = componentize;
function componentize(bow){
    var missing = [];

    bow.each(function(pkg){
        var files = bow.util.asArray(pkg.main);
        if(_.isEmpty(files)){
            missing.push(pkg.name);
        }
        if(!_.isEmpty(pkg.ignore)){
            //TODO
        }
        _.merge(pkg, groupComponentFiles(files));
    });

    if(missing.length){
        missing.sort();
        missing = _.map(missing, bow.util.quote).join(", ")
        console.warn(PLUGIN_NAME,'missing files', missing);
    }
}

function groupComponentFiles(files){

    return _.groupBy(files, function(x){
        var ext = path.extname(x).toLowerCase();

        var group = _.findKey(componentize.GROUPS, function(exts){
            return _.contains(exts, ext);
        });

        return group || 'files';
    });
}

/**
 * UTILS
 */

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