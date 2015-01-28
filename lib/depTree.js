var _ = require("lodash")
    , Topo = require('topo')

//TODO REFACTOR this MESS

module.exports = function depTree(pkgs){
    var flat = getDepMap(pkgs)
        , sorted = getSorted(flat)
        , full = getSortedMap(flat, sorted)

    return {
        flat: flat,
        sorted: sorted,
        full: full,
        depends: _.partial(getAllOrdered, flat, sorted),
        resolve: _.partial(resolve,full,sorted),
        reorder: _.partial(reorder, sorted),
        // given pkgNames, returns array append with dependencies (unsorted)
        expand: function(pkgNames){
            return getAllDependencies(flat, pkgNames, true)
        }
    }
};

// given pkgNames returns sorted list of pkgs and all dependencies
function resolve(sortedMap,sorted,pkgNames){
    pkgNames = asArray(pkgNames);
    var deps = _.flatten(_.values(_.pick(sortedMap,pkgNames)));
    return reorder(sorted,pkgNames.concat(deps));
}

function test(){
    var repo = {
        packages: {
            a: {dependencies: {b: 1}},
            b: {dependencies: {c: 1}},
            c: {dependencies: {d: 1}},
            d: {dependencies: {e: 1}},
            e: {},
            ace: {dependencies: {a: 1, c: 1, e: 1}}
        }
    };
    var depMap = getDepMap(repo);
    var sorted = getSorted(depMap);
    var sMap = getSortedMap(depMap, sorted);
    console.log('depMap', depMap)
    console.log('sorted', sorted)
    console.log('sMap', sMap)
}
//test();

// returns { component: deps[], ...}
function getDepMap(pkgs){
    pkgs = asPackages(pkgs);
    return _.mapValues(pkgs, _.compose(_.keys, _.property('dependencies')));
}

function getSorted(depMap){
    if(depMap.packages)depMap = getDepMap(depMap);
    var sorted = sortDependencies(depMap);
    return sorted;
}

function getSortedMap(deps, sorted, include){
    return _.mapValues(deps, function(pkg, pkgName){
        return getAllOrdered(deps, sorted, pkgName, include)
    });
}

function getAllOrdered(depMap, sorted, pkgNames, include){
    return reorder(sorted, getAllDependencies(depMap, pkgNames, include));
}

function reorder(sorted, pkgs){
    return _.intersection(sorted, pkgs);
}

function getAllDependencies(depMap, pkgNames, include){
    pkgNames = asArray(pkgNames);
    var len = pkgNames.length;
    var cur = 0;
    while(cur < pkgNames.length){
        pkgNames = _.union(pkgNames, depMap[pkgNames[cur++]]);
    }
    if(!include)pkgNames = pkgNames.slice(len);
    return pkgNames;
}

function sortDependencies(packages, superGroups){
    var topo;
    var sGroups = packages;
    var pkgNames = _.keys(packages);

    if(superGroups !== false)superGroups = superGroups || ['angular', 'bootstrap', 'jquery'];

    if(superGroups && superGroups.length){

        var groupName = _.memoize(function(name){
            var group = _.find(superGroups, function(a){
                return _.contains(name, a);
            });
            if(!group){
                group = _.sortBy(packages[name]).join('+') || "";
            }
            group = "@" + group;
            return group;
        });

        sGroups = {};
        _.each(packages, function(req, name){
            var grp = groupName(name);
            var after = _.map(req, groupName);
            after = _.difference(after, [grp]);
            sGroups[grp] = _.union(sGroups[grp] || [], after)
        })
        topo = new Topo();
        _.each(sGroups, function(req, name){
            try {
                topo.add(name, {after: req, group: name });
            } catch(err){
                console.error('CIRCULAR DEPENDENCY in', name,'with', req, err);
            }
        });

        sGroups = topo.nodes;
        sGroups = _.object(sGroups, _.map(sGroups, function(group){
            return _.filter(pkgNames, function(name){
                return groupName(name) == group;
            });
        }))
    } else sGroups = {"all": pkgNames};

    var groups = _.chain(sGroups)
        .map(function(group){
            topo = new Topo();
            _.each(group, function(name){
                try {
                    topo.add(name, {after: packages[name], group: name });
                } catch(err){
                    console.error('CIRCULAR DEPENDENCY in', name,'with', packages[name], err);
                }
            });
            return topo.nodes;
        })
        .flatten()
        .value();
    
    return groups;
}

/**
 * HELPERS
 */


// accepts repo or pkgs
function asPackages(obj){
    return obj.packages || obj;
}

function asArray(x){
    return _.isString(x) ? [x] : _.toArray(x);
}