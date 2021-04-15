const fs = require("fs");
const path = require("path");

const CopyWebpackPlugin = require("copy-webpack-plugin");
const CleanWebpackPlugin = require('clean-webpack-plugin');
const I18nPlugin = require("@zainulbr/i18n-webpack-plugin");

const utils = require("./utils");

module.exports = function () {
    // Prepare the dist directories. It has to exist before we attempt to create the .zip archive.
    if (!fs.existsSync("dist")) {
        fs.mkdirSync("dist");
    }
    const default_splash_path = utils.getBaseOrCustomPath("src/resources/splash.png");
    const default_resources_path = utils.getBaseOrCustomPath("src/www/resources.zip");
    var styling_path = utils.getBaseOrCustomPath("src/www/styles/");

    // Build the configuration object.
    return {
        mode: "development",
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
                    exclude: /node_modules\/(?!(@mendix\/mendix-hybrid-app-base)\/).*/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            presets: [
                                ['@babel/preset-env', {
                                    targets: "> 0.25%, not dead",
                                }]
                            ],
                            plugins: ["@babel/transform-regenerator"],
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
            new CopyWebpackPlugin({
                patterns: [
                    {
                        context: path.dirname(default_splash_path),
                        from: path.basename(default_splash_path),
                        to: path.basename(default_splash_path),
                        noErrorOnMissing: true

                    },
                    {
                        context: path.dirname(default_resources_path),
                        from: path.basename(default_resources_path),
                        to: path.normalize("www/resources.zip"),
                        noErrorOnMissing: true
                    },
                    {
                        context: path.dirname(styling_path),
                        from: '**/*.css',
                        to: path.normalize("www/css/[name].css"),
                        noErrorOnMissing: true
                    },
                    ...utils.getBaseAndCustomPaths("src/www/images").map(function (dir) {
                        return {
                            context: dir,
                            from: "**/*",
                            to: path.normalize("www/img"),
                            noErrorOnMissing: true
                        };
                    })
                ]
            })
        ]
    };
};
