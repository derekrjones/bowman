var expect = require("chai").use(require('chai-fs')).expect

var path = require('path')
var _ = require('lodash')
var rimraf = require('rimraf')
var bowman = require('../')

var SRC = path.resolve(__dirname, './src');
var DEST = path.join(SRC, '.bowman.json');

describe("test", function(){
  before(function(done){
    rimraf(DEST,done)
  })

  it("should not have a bowman file", function(){
    expect(DEST).to.not.be.a.path();
  })

  it("should automatically create a bowman file", function(){
    return bowman({update: false, cwd: SRC})
      .then(function(bow){
        return expect(DEST).to.be.a.file();
      })
  })

  it("should read a bower file", function(){
    return bowman({update: false, cwd: SRC})
  })

  it("should update a bowman file", function(){
    return bowman({update: true, cwd: SRC})
      .then(function(bow){
        return expect(DEST).to.be.a.file();
      })
  })
})