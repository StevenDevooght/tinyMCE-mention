var gulp = require('gulp'),
    shell = require('gulp-shell'),
    qunit = require('gulp-qunit');

gulp.task('bower', shell.task('bower install'));

gulp.task('test', ['bower'], function() {
    return gulp.src('./tests/test_runner.html')
        .pipe(qunit());
});

gulp.task('default', ['test']);