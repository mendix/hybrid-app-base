var fs = require("fs");
var path = require("path");
var sanitize = require("sanitize-filename");

module.exports = (function () {
    var loadConfigFile = function (absolute_path) {
        try {
            return require(absolute_path);
        } catch (ex) {
            return {};
        }
    };

    var getBaseOrCustomPath = function (partial_path) {
        return fs.existsSync(path.join(process.cwd(), partial_path))
            ? path.join(process.cwd(), partial_path)
            : path.join(__dirname, partial_path);
    };

    var getBaseAndCustomPaths = function (partial_path) {
        return [path.join(process.cwd(), partial_path), path.join(__dirname, partial_path)];
    };

    var loadConfiguration = function (partial_path) {
        return Object.assign(
            {},
            loadConfigFile(path.join(__dirname, partial_path)),
            loadConfigFile(path.join(process.cwd(), partial_path))
        );
    };

    var constructArchiveName = function (settings) {
        var nameParts = [sanitize(settings.name), settings.version, settings.options.environment];

        if (settings.options.architecture) {
            nameParts.push(settings.options.architecture);
        }

        return nameParts.join("-");
    };

    return {
        getBaseOrCustomPath: getBaseOrCustomPath,
        getBaseAndCustomPaths: getBaseAndCustomPaths,
        loadConfiguration: loadConfiguration,
        constructArchiveName: constructArchiveName,
    };
})();
