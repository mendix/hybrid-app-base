var fs = require("fs");
var path = require("path");
var util = require("util");

var webpack = require("webpack");

var ContextReplacementPlugin = require("webpack/lib/ContextReplacementPlugin");
var CopyWebpackPlugin = require("copy-webpack-plugin");
var WebpackArchivePlugin = require("webpack-archive-plugin");
var HtmlWebpackPlugin = require("html-webpack-plugin");
var ExtractTextWebpackPlugin = require("extract-text-webpack-plugin");
var I18nPlugin = require("i18n-webpack-plugin");
var UglifyJSPlugin = require('uglifyjs-webpack-plugin');
var CleanWebpackPlugin = require('clean-webpack-plugin');

var Mustache = require("mustache");

var utils = require("./utils");

var settings = {
    options: {
        environment: "prod",
        architecture: "arm"
    },

    parameters: utils.loadConfiguration("config/parameters.json"),
    resources: utils.loadConfiguration("config/resources.json")
};

module.exports = function(env) {
    // Process the command line parameters.
    if (env) {
        ["dev", "sandbox", "test", "accp", "prod"].forEach(function(environment) {
            if (env[environment]) {
                console.log("Setting the requested environment to " + environment);
                Object.assign(settings.options, { "environment": environment });
            }
        });

        ["x86", "arm"].forEach(function(architecture) {
            if (env[architecture]) {
                console.log("Setting the requested architecture to " + architecture);
                Object.assign(settings.options, { "architecture": architecture });
            }
        });
    }

    // Propagate the environment settings
    var environments = utils.loadConfiguration("config/environments.json");

    if (environments[settings.options.environment]) {
        Object.assign(settings.parameters, environments[settings.options.environment]);
    }

    // Prepare the dist directories. It has to exist before we attempt to create the .zip archive.
    if (!fs.existsSync("dist")) {
        fs.mkdirSync("dist");
    }

    var index_template_path = utils.getBaseOrCustomPath("src/www/index.html.mustache");
    var config_template_path = utils.getBaseOrCustomPath("src/config.xml.mustache");

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
        // devtool: "cheap-module-eval-source-map",
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
            // We expose some global variables to our app (set at compile time)
            new webpack.DefinePlugin({
                URL: JSON.stringify(settings.parameters.url),
                ENABLEOFFLINE: settings.parameters.enableOffline,
                REQUIREPIN: settings.parameters.requirePin
            }),
            // Make the static strings translatable / configurable
            new I18nPlugin(utils.loadConfiguration("config/texts.json"), {
                hideMessage: true
            }),
            new CopyWebpackPlugin([ // Process and copy the config.xml file
                {
                    context: path.dirname(config_template_path),
                    from: path.basename(config_template_path),
                    to: "config.xml",
                    transform: function (content) {
                        return Mustache.render(content.toString(), settings);
                    }
                }]
            ),
            new CopyWebpackPlugin( // Image files
                utils.getBaseAndCustomPaths("src/www/images").map(function(dir) {
                    return {
                        context: dir,
                        from: "**/*",
                        to: path.normalize("www/img")
                    }
                })
            ),
            new CopyWebpackPlugin( // Resource files
                utils.getBaseAndCustomPaths("src/resources").map(function(dir) {
                    return {
                        context: dir,
                        from: "**/*",
                        to: "res"
                    }
                })
            ),
            new ExtractTextWebpackPlugin({ // Extract 'require'ed CSS files into one CSS file
                filename: "www/css/[name].css",
                allChunks: false
            }),
            new HtmlWebpackPlugin(Object.assign({ // Generate the index.html
                filename: "www/index.html",
                inject: true,
                template: index_template_path
            }, settings)),
            new WebpackArchivePlugin({ // Compress everything into a ZIP file that can be uploaded to Phonegap Build
                output: path.join("dist", util.format("%s-%s-%s-%s",
                    settings.parameters.identifier,
                    settings.parameters.version,
                    settings.options.environment,
                    settings.options.architecture)),
                format: "zip"
            })
        ]
    };

    if (env && env.prod) {
        config.devtool = "source-map";

        config.plugins.push(
            new UglifyJSPlugin({
                sourceMap: true
            })
        )
    }

    return config;
};