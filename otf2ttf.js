const otf2ttf = require("otf2ttf");
var gulp = require("gulp");
gulp.task("otf2ttf", [], function () {
    return gulp
        .src("otf/*.otf")
        .pipe(otf2ttf())
        .pipe(
            gulp.dest(function (file) {
                return "fonts/" + file.data.fontName;
            })
        );
});
