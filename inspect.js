var bowman = require('./');
var _ = require('lodash');

var pkgs;

bowman(function(err, bow){
  var c = bow.select(["restangular", "angular-ui-router"])
    .ignore('lodash')
    .add('underscore')
    .components()
  // c === ["underscore","angular","restangular","angular-ui-router"]

  console.log('c', c);
  var ex = bow.prop('exports');
  console.log('ex', ex)
  /* {
  "underscore": "_",
  "angular": "angular"
  "restangular": "angular.module('restangular')"
  "angular-ui-router": "angular.module('ui.router')"
  } */

  var res;
  res = bow.scriptsTree();
  console.log('scriptsTree', res)

  res = bow.scripts();
  console.log('scripts', res)

});