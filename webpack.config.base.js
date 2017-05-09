var fs = require("fs");
var path = require("path");
var util = require("util");

var webpack = require("webpack");

var ContextReplacementPlugin = require("webpack/lib/ContextReplacementPlugin");
var CopyWebpackPlugin = require("copy-webpack-plugin");
var HtmlWebpackPlugin = require("html-webpack-plugin");
var ExtractTextWebpackPlugin = require("extract-text-webpack-plugin");
var I18nPlugin = require("i18n-webpack-plugin");
var CleanWebpackPlugin = require('clean-webpack-plugin');

var utils = require("./utils");
var compile_settings = require("./settings");

module.exports = function(env) {
    const settings = compile_settings(env);

    // Prepare the dist directories. It has to exist before we attempt to create the .zip archive.
    if (!fs.existsSync("dist")) {
        fs.mkdirSync("dist");
    }

    var index_template_path = utils.getBaseOrCustomPath("src/www/index.html.mustache");
    var config_template_path = utils.getBaseOrCustomPath("src/config.xml.mustache");
    var default_splash_path = utils.getBaseOrCustomPath("src/resources/splash.png");

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
        devtool: "cheap-module-eval-source-map",
        module: {
            // Rules are used to process specific file types
            rules: [
                {
                    test: /\.mustache$/,
                    loader: 'mustache-loader'
                },
                {
                    test: /\.css$/,
                    use: ExtractTextWebpackPlugin.extract({
                        fallback: "style-loader",
                        use: "css-loader"
                    })
                }
            ]
        },
        // This is where the bulk of the action happens
        plugins: [
            new ContextReplacementPlugin(/template\/styles/, path.join(process.cwd(), "src/www/styles"), true, /.*\.css$/),
            // Clean up previous builds
            new CleanWebpackPlugin(["build"], {
                root: process.cwd(),
                exclude: ["platforms", "plugins"]
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
                }
            ]),
            new ExtractTextWebpackPlugin({ // Extract 'require'ed CSS files into one CSS file
                filename: "www/css/[name].css",
                allChunks: false
            }),
            new HtmlWebpackPlugin(Object.assign({ // Generate the index.html
                filename: "www/index.html",
                inject: true,
                template: index_template_path
            }, settings))
        ]
    };

    return config;
};