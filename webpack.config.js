var path = require("path");
var util = require("util");

var webpack = require("webpack");
var webpack_merge = require('webpack-merge');

var CopyWebpackPlugin = require("copy-webpack-plugin");
var WebpackArchivePlugin = require("webpack-archive-plugin");

var Mustache = require("mustache");
var sanitize = require("sanitize-filename");

var base_config = require("./webpack.config.base");

var utils = require("./utils");

module.exports = function(env) {
    const settings = require("./settings")(env);

    var config_template_path = utils.getBaseOrCustomPath("src/config.xml.mustache");
    var settings_template_path = utils.getBaseOrCustomPath("src/www/settings.json.mustache");

    var config = webpack_merge(base_config(env), {
        plugins: [
            new CopyWebpackPlugin([ // Process and copy the config.xml file
                {
                    context: path.dirname(config_template_path),
                    from: path.basename(config_template_path),
                    to: "config.xml",
                    transform: function (content) {
                        return Mustache.render(content.toString(), settings);
                    }
                },
                {
                    context: path.dirname(settings_template_path),
                    from: path.basename(settings_template_path),
                    to: path.normalize("www/settings.json"),
                    transform: function (content) {
                        return Mustache.render(content.toString(), settings);
                    }
                }
            ]),
            new CopyWebpackPlugin( // Resource files
                utils.getBaseAndCustomPaths("src/resources").map(function(dir) {
                    return {
                        context: dir,
                        from: "**/*",
                        to: "res"
                    }
                })
            ),
            new WebpackArchivePlugin({ // Compress everything into a ZIP file that can be uploaded to Phonegap Build
                output: path.join("dist", util.format("%s-%s-%s-%s",
                    sanitize(settings.name),
                    settings.version,
                    settings.options.environment,
                    settings.options.architecture)),
                format: "zip"
            })
        ]
    });

    if (!settings.options.debug) {
        config = webpack_merge(config, {
            devtool: "source-map",

            plugins: [
                new webpack.optimize.UglifyJsPlugin({
                    sourceMap: true,
                    ecma: 5,
                    toplevel: true,
                    extractComments: true, parallel: {
                        cache: true,
                        workers: 2
                    }
                })
            ]
        })
    }

    return config;
};