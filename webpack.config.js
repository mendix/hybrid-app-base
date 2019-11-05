var fs = require("fs");
var path = require("path");

var webpack = require("webpack");
var webpack_merge = require('webpack-merge');

var CopyWebpackPlugin = require("copy-webpack-plugin");
var ZipPlugin = require("zip-webpack-plugin");
var HtmlWebpackPlugin = require("html-webpack-plugin");
var HtmlWebpackIncludeAssetsPlugin = require('html-webpack-include-assets-plugin');

var Mustache = require("mustache");

var base_config = require("./webpack.config.base");

var utils = require("./utils");

module.exports = function(env) {
    const settings = require("./settings")(env);

    var config_template_path = utils.getBaseOrCustomPath("src/config.xml.mustache");
    var settings_template_path = utils.getBaseOrCustomPath("src/www/settings.json.mustache");
    var index_template_path = utils.getBaseOrCustomPath("src/www/index.html.mustache");
    var styling_path = utils.getBaseOrCustomPath("src/www/styles/");
    var google_services_json_path = utils.getBaseOrCustomPath("config/google-services.json");
    var google_service_plist_path = utils.getBaseOrCustomPath("config/GoogleService-Info.plist");
    var build_extras_gradle_path = utils.getBaseOrCustomPath("config/build-extras.gradle");
    var before_build_script_path = utils.getBaseOrCustomPath("scripts/before_build.js");

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
            new CopyWebpackPlugin([
                {
                    context: path.dirname(styling_path),
                    from: '**/*.css.mustache',
                    to: path.normalize("www/css/[name]"),
                    transform: function (content) {
                        return Mustache.render(content.toString(), settings);
                    }
                }
            ]),
            new HtmlWebpackPlugin(Object.assign({ // Generate the index.html
                filename: "www/index.html",
                inject: true,
                template: index_template_path
            }, settings)),
            new HtmlWebpackIncludeAssetsPlugin({ // Copy styling files
                assets: [
                    "www/css/index.css",
                    { path: 'www/css', glob: '**/*.css', globPath: path.normalize('src/www/styles/') }
                ],
                append: false
            })
        ]
    });

    if (settings.permissions.push) {
        config = webpack_merge(config, {
            plugins: [
                new CopyWebpackPlugin([
                    ...(fs.existsSync(google_services_json_path) ?
                        [{
                            context: path.dirname(google_services_json_path),
                            from: path.basename(google_services_json_path),
                            to: path.join("config", path.basename(google_services_json_path))
                        }] : []),
                    ...(fs.existsSync(google_service_plist_path) ?
                        [{
                            context: path.dirname(google_service_plist_path),
                            from: path.basename(google_service_plist_path),
                            to: path.join("config", path.basename(google_service_plist_path))
                        }] : []),
                    {
                        context: path.dirname(build_extras_gradle_path),
                        from: path.basename(build_extras_gradle_path),
                        to: path.join("config", path.basename(build_extras_gradle_path))
                    },
                    {
                        context: path.dirname(before_build_script_path),
                        from: path.basename(before_build_script_path),
                        to: path.join("scripts", path.basename(before_build_script_path))
                    }
                ])
            ]
        });
    }

    config = webpack_merge(config, {
        plugins: [
            new ZipPlugin({
                path: "../dist",
                filename: utils.constructArchiveName(settings)
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
        });
    }

    return config;
};
