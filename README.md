** Currently undergoing migration and is not stable. Check back soon for updates **

# bowman

** Build Better with Bowman **

## Features

- easily build applications with bower components
- orders dependencies
- validates and repairs broken packages
- easily modify existing packages
- plugin support
- build tools for browserify, gulp and angular
- supports both Promises and Node-Style Callbacks

# Command Line

```
bowman bundle [components] {OPTIONS} outfile.js outfile.css

Standard Options:

        --dir, -d  Specify the output directory

      --bower, -b  Path to bower file or directory
  
     --ignore, -i  Ignore a component
 
     --plugin, -p  Add a plugin
     
  --transform, -t  Use a transform on components.
  
     --source, -s  Enable source maps
      
    --verbose, -v  Log detailed information

       --help, -h  Show this message

For advanced options, type `bowman --help advanced`.

Specify a parameter.
```

# Usage

using promises (recommended style)

    var bowman = require('bowman')();
    bowman.then(function(bow){
        gulp.src(bow.scripts())
            .pipe(concat('common.js'))
            .pipe(gulp.dest('./dist'))
        
        gulp.src(bow.style())
            .pipe(concat('common.css'))
            .pipe(gulp.dest('./dist'))
    });
        
lazy-load with node-style callback

    var bowman = require('bowman');
    bowman(function(err, bow){
    
        var c = bow.select(["restangular","angular-ui-router"])
            .ignore('lodash')
            .add('underscore')
            .components()
        // c == ["underscore","angular","restangular","angular-ui-router"]
        
        var ex = bow.prop('exports');
        /* ex == {
            "underscore": "_",
            "angular": "angular"
            "restangular": "angular.module('restangular')"
            "angular-ui-router": "angular.module('ui.router')"
        } */
        
        var src = bow.scriptsTree();

        for(var i in src){
            bundler.require(src[i][0],{exports: ex[i]});
        }
    });  

# Together With..

## Gulp

    var bowman = require('bowman')();
    var gulp = require('gulp');
    var concat = require('gulp-concat');
    var mergeStream = require('merge-stream');
    
    gulp.task("common", function(){
        return bowman.then(function(bow){
            bow.ignore('jquery'); // if want to use a cdn
            var scripts = gulp.src(bow.scripts())
                .pipe(concat('common.js'))
                .pipe(gulp.dest('./dist'))
                
            var styles = gulp.src(bow.styles())
                .pipe(concat('common.css'))
                .pipe(gulp.dest('./dist'))
                
            return mergeStream(scripts, styles);
        });
    });
    
## Browserify

### Exposify

exposify.config = bow.prop('exports');

# Plugins
    
    // bower.json
    "bowman": { 
        "plugins": ["somePlugin"] 
        "somePlugin": {/*config*/}
    }


## Defaults (automatically applied)

- normalizer - normalizes packages to fit to spec
- modifiers - easily batch modify/add package information
- resolvePaths - verifies files exists
- componentize - fields for scripts, style, templates and more

## Plugins 
[Full list of plugins on NPM](https://npmjs.org/browse/keyword/bowman-plugin)
- bowman-exports - automagically shims exports for use with bundlers like browserify
- bowman-angular - build better angular apps

## Creating a Plugin

    // return promise
    module.exports = function(bow, opts){
        ...
        return promise; // optional
    }
    
    // callback-style
    module.exports = function(bow, opts, done){
        ...
        done(err);
    }
    
    // alt.
    exports._transform = function(bow, opts){...}

## Publishing a Plugin
- module name in form of 'bowman-<plugin-name>'
- add `bowman` and `bowman-plugin` keywords to package.json
- follow [semver](semver.org) rules when bumping your package

# Contribute to Bowman
- create an issue on github
    
