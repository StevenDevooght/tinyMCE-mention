var gulp = require('gulp'),
    qunit = require('gulp-qunit');

gulp.task('test', function() {
    return gulp.src('./tests/test_runner.html')
        .pipe(qunit());
});