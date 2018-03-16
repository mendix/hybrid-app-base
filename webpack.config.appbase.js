var path = require("path");
var util = require("util");

var webpack = require("webpack");
var webpack_merge = require('webpack-merge');

var CopyWebpackPlugin = require("copy-webpack-plugin");
var WebpackArchivePlugin = require("webpack-archive-plugin");
var HtmlWebpackPlugin = require("html-webpack-plugin");
var HtmlWebpackIncludeAssetsPlugin = require('html-webpack-include-assets-plugin');
var UglifyJSPlugin = require('uglifyjs-webpack-plugin');

var base_config = require("./webpack.config.base");
var package_config = require("./package.json");
var utils = require("./utils");

module.exports = function(env) {
    var config_template_path = utils.getBaseOrCustomPath("src/config.xml.mustache");
    var settings_template_path = utils.getBaseOrCustomPath("src/www/settings.json.mustache");
    var index_template_path = utils.getBaseOrCustomPath("src/www/index.html.mustache");
    var styles_template_path = utils.getBaseOrCustomPath("src/www/styles/index.css.mustache");

    return webpack_merge(base_config(env), {
        devtool: "source-map",
        plugins: [
            new CopyWebpackPlugin([ // Process and copy the config.xml file
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
                    context: path.dirname(index_template_path),
                    from: path.basename(index_template_path),
                    to: path.normalize("www/index.html"),
                    transform: (content, path) => content.toString().replace(/htmlWebpackPlugin\.options\./g, "")
                },
                {
                    context: path.dirname(styles_template_path),
                    from: path.basename(styles_template_path),
                    to: path.normalize("www/css/index.css")
                }
            ]),
            new HtmlWebpackPlugin({ // Generate the index.html
                filename: "www/index.html",
                inject: true,
                template: index_template_path
            }),
            new HtmlWebpackIncludeAssetsPlugin({ // Copy styling files
                assets: [
                    "www/css/index.css",
                    { path: 'www/css', glob: '**/*.css[.mustache]', globPath: path.normalize('src/www/styles/'), type: 'css' }
                ],
                append: false
            }),
            new WebpackArchivePlugin({ // Compress everything into a ZIP file that can be uploaded to Phonegap Build
                output: path.join("dist", util.format("appbase-%s", package_config.version)),
                format: "zip"
            }),
            new UglifyJSPlugin({
                sourceMap: true
            })
        ]
    });
};
