var fs = require("fs");
var path = require("path");

var webpack = require("webpack");

var CopyWebpackPlugin = require("copy-webpack-plugin");
var CleanWebpackPlugin = require('clean-webpack-plugin');
var I18nPlugin = require("i18n-webpack-plugin");

var utils = require("./utils");
var compile_settings = require("./settings");

module.exports = function(env) {
    const settings = compile_settings(env);

    // Prepare the dist directories. It has to exist before we attempt to create the .zip archive.
    if (!fs.existsSync("dist")) {
        fs.mkdirSync("dist");
    }

    var default_splash_path = utils.getBaseOrCustomPath("src/resources/splash.png");
    var styling_path = utils.getBaseOrCustomPath("src/www/styles/");

    // Build the configuration object.
    var config = {
        // The starting point of our app
        entry: {
            bundle: utils.getBaseOrCustomPath("src/www/scripts/entry.js")
        },
        // The output of our build run
        output: {
            path: path.resolve("build"),
            filename: "www/js/bundle.js"
        },
        devtool: "eval-source-map",
        module: {
            // Rules are used to process specific file types
            rules: [
                {
                    test: /\.css$/,
                    use: "css-loader"
                },
                {
                    test: /\.mustache$/,
                    use: "mustache-loader"
                },
                {
                    test: /\.js$/,
                    exclude: /node_modules\/(?!(mendix-hybrid-app-base)\/).*/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            presets: [['env', {
                                "targets": {
                                    "uglify": true
                                }
                            }]],
                            plugins: ["transform-regenerator"],
                            cacheDirectory: true
                        }
                    }
                }
            ]
        },
        // This is where the bulk of the action happens
        plugins: [
            // Clean up previous builds
            new CleanWebpackPlugin(["build"], {
                root: process.cwd(),
                exclude: ["platforms", "plugins", "package.json"]
            }),
            // Make the static strings translatable / configurable
            new I18nPlugin(utils.loadConfiguration("config/texts.json"), {
                hideMessage: true
            }),
            new CopyWebpackPlugin( // Image files
                utils.getBaseAndCustomPaths("src/www/images").map(function(dir) {
                    return {
                        context: dir,
                        from: "**/*",
                        to: path.normalize("www/img")
                    }
                })
            ),
            new CopyWebpackPlugin([
                {
                    context: path.dirname(default_splash_path),
                    from: path.basename(default_splash_path),
                    to: path.basename(default_splash_path)
                },
                {
                    context: path.dirname(styling_path),
                    from: '**/*.css',
                    to: path.normalize("www/css/[name].css")
                }
            ])
        ]
    };

    return config;
};