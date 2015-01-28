var _ = require('lodash');

module.exports = function applyModifiers(bow, modifiers){
  // modify, alter, extend (prop/pkg)
  _.each(modifiers, function(mods, propName){
    bow.alter(propName, mods);
  });
}