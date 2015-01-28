var bowman = require('bowman');
var gulp = require('gulp');
var concat = require('gulp-concat');
var mergeStream = require('merge-stream');

var through = require('through2');
function logger(id){
    return through.obj(function(file, enc, cb){
        console.log(id, file.path);
        cb(null, file);
    }, function(cb){
        console.log(id, 'end');
        cb();
    })
}

gulp.task("vendor", function(){
    return bowman().then(function(bow){

        console.log('vendor', bow.components());

        var scripts = gulp.src(bow.scripts())
            .pipe(concat('common.js'))
            .pipe(gulp.dest('./dist'))
            .on('error', console.error)

        var styles = gulp.src(bow.styles())
            .pipe(concat('common.css'))
            .pipe(gulp.dest('./dist'))
            .on('error', console.error)

        return mergeStream(scripts, styles);
    });
});