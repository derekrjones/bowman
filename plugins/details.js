var _ = require('lodash')

module.exports = function details(repo){
    var index = indexModules(repo);
    var components = findComponents(index, ["ui.router", "ui.bootstrap"]);
    console.log('COMPONENTS', components);
    console.log('ALL COMPONENTS', getDependencies(repo, components.concat("bootswatch")));
    console.log('FILES', componentFiles(repo, components.concat("bootswatch")));
    console.log("ASSETS", JSON.stringify(_.flatten(_.pluck(repo, "assets")).sort(), null, " "));

    var keys = _.flatten(_.map(_.pluck(repo, "modules"), _.keys));

    //TODO relocate
    function moduleTree(pkgs){
        pkgs = pkgs.slice();
        pkgs.sort();
        _.each(pkgs, function(pkg, cur){
            while(++cur < pkgs.length && pkgs[cur].indexOf(pkg + ".") === 0){
                pkgs[cur] = pkgs[cur].replace(pkg.trimLeft(), " ");
            }
        });
        return pkgs;
    }

    console.log(moduleTree(keys).join("\n"));
}