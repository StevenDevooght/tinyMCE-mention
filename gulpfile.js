var gulp = require('gulp'),
    shell = require('gulp-shell'),
    jshint = require('gulp-jshint'),
    qunit = require('gulp-qunit');

gulp.task('lint', function () {
    return gulp.src(['./mention/plugin.js', './tests/test_mention.js'])
        .pipe(jshint())
        .pipe(jshint.reporter('fail'));
});

gulp.task('bower', ['lint'], shell.task('bower install'));

gulp.task('test', ['bower'], function () {
    return gulp.src('./tests/test_runner.html')
        .pipe(qunit({ timeout: 10 }));
});

gulp.task('default', ['test']);