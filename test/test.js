var bowman = require('bowman');
var _ = require('lodash');

function t1(){
    bowman(function(err,b){
        if(err){
            console.error('ERROR',err);
        }
        console.log(b);
    });
}

t1();