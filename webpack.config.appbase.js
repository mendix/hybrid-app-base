const path = require("path");
const util = require("util");

let {merge: webpack_merge} = require('webpack-merge');

const CopyWebpackPlugin = require("copy-webpack-plugin");
const ZipPlugin = require("zip-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const HtmlWebpackTagsPlugin = require('html-webpack-tags-plugin');
const TerserPlugin = require('terser-webpack-plugin');

const base_config = require("./webpack.config.base");
const package_config = require("./package.json");
const utils = require("./utils");

module.exports = function (env) {
    const config_template_path = utils.getBaseOrCustomPath("src/config.xml.mustache");
    const settings_template_path = utils.getBaseOrCustomPath("src/www/settings.json.mustache");
    const index_template_path = utils.getBaseOrCustomPath("src/www/index.html.mustache");
    const styles_template_path = utils.getBaseOrCustomPath("src/www/styles/index.css.mustache");

    return webpack_merge(base_config(env), {
        mode: "production",
        devtool: "source-map",
        optimization: {
            minimize: true,
            minimizer: [new TerserPlugin({
                parallel: 2,
                terserOptions: {
                    ecma: 5,
                    toplevel: true
                }
            })],
        },
        plugins: [
            new CopyWebpackPlugin({
                patterns: [ // Process and copy the config.xml file
                    {
                        context: path.dirname(config_template_path),
                        from: path.basename(config_template_path),
                        to: "config.xml"
                    },
                    {
                        context: path.dirname(settings_template_path),
                        from: path.basename(settings_template_path),
                        to: path.normalize("www/settings.json")
                    },
                    {
                        context: path.dirname(styles_template_path),
                        from: path.basename(styles_template_path),
                        to: path.normalize("www/css/index.css")
                    }
                ]
            }),
            new HtmlWebpackPlugin({ // Generate the index.html
                filename: "www/index.html",
                inject: "body",
                template: index_template_path,
            }),
            new HtmlWebpackTagsPlugin({ // Copy styling files
                tags: [
                    "www/css/index.css"
                ],
                append: false,

            }),
            new ZipPlugin({
                path: "../dist",
                filename: util.format("appbase-%s", package_config.version)
            })
        ]
    });
};
