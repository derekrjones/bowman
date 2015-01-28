var _ = require('lodash')

module.exports = globMerge;

/*
 advanced merge that can delete values

 mergeExisting(root.packages,{
    "myComponent": {
        main: ["+","lib/myComponent.min.js","!lib/myComponent.js"],
        list1: ["!","a","b"], // "!" = replace previous list
        list2: ["+","a","b"], // "+" = force concat (even if orig value is a string)
        list3: ["a","b"] // concats or replaces depending on orig
        exports: "MyComponent", //overwrites
        dependencies: {
            "jquery": "!", // removes jquery
        }
    }
},globMerge)
*/

// TODO FIX doesn't work deeply
function globMerge(obj, src){
  // merge objects and arrays
  _.merge(obj, src, mergeArrayGlob);
  //remove rejections
  removeRejections(obj, _.keys(src));
  return obj;
}

function removeRejections(obj, keys){
  keys = keys || _.keys(obj);
  _.each(keys, function(k){
    var o = obj[k];
    if(_.isPlainObject(o)){
      obj[k] = _.omit(o, _rejector);
      removeRejections(obj[k]);
    } else if(_.isArray(o)){

      var rejections = _.reduce(o, function(acc, r){
        if(_rejector(r)){
          acc.push(r);
          acc.push(r.substr(1));
        }
        return acc;
      }, []);

      obj[k] = _.difference(o, rejections);
    }
  });
  return obj;
}

//reject values like '!foo'
function _rejector(x){
  return _.isString(x) && x.charAt(0) == '!';
}
// iff both are arrays
function mergeArray(orig, src){
  if(_.isArray(orig) && _.isArray(src)){
    return orig.concat(src);
  }
}

// if src is array
function mergeArrayAdd(orig, src){
  if(_.isArray(src)){
    return asArray(orig).concat(src);
  }
}

// conditional with '+' or '!' (useful for modifying data via a config)
function mergeArrayGlob(orig, src){
  if(_.isArray(src)){
    // if orig is not array can prepend it with ["+",...]
    if(src[0] == '+') return asArray(orig).concat(src.slice(1));
    // replace orig with ["!",...]
    if(src[0] == "!") return src.slice(1)
    // concat arrays, replace otherwise
    return _.isArray(orig) ? orig.concat(src) : src;
  }
}

/**
 * HELPERS
 */

exports.asArray = asArray;
function asArray(x){
  return _.isString(x) ? [x] : _.toArray(x);
}