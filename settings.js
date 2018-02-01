var fs = require("fs");
var utils = require("./utils");

var config_snippet_path = utils.getBaseOrCustomPath("config/config.xml.snippet");
var loader_snippet_path = utils.getBaseOrCustomPath("config/loader.html.snippet");
var loader_styling_snippet_path = utils.getBaseOrCustomPath("config/loader.css.snippet");
var custom_styling_snippet_path = utils.getBaseOrCustomPath("config/custom.css.snippet");


function compile_settings(env) {
    var settings = Object.assign(
        {
            options: {
                environment: "prod",
                architecture: "arm"
            }
        },
        utils.loadConfiguration("config/parameters.json"),
        utils.loadConfiguration("config/resources.json")
    );

    var environmentAliases = {
        "p": "production",
        "prod": "production",
        "a": "acceptance",
        "accp": "acceptance",
        "t": "test",
        "s": "sandbox",
        "d": "development",
        "dev": "development"
    };

    // Process the command line parameters.
    if (env) {
        if (env["target"]) {
            Object.assign(settings.options, { "environment": env["target"] });
        }

        ["x86", "arm"].forEach(function(architecture) {
            if (env[architecture]) {
                Object.assign(settings.options, { "architecture": architecture });
            }
        });

        Object.assign(settings.options, { "debug": (env["debug"] && env["debug"] !== "false") });
    }

    // Propagate the environment settings
    var environments = utils.loadConfiguration("config/environments.json");

    var target = settings.options.environment;
    if (environmentAliases[target]) {
        target = environmentAliases[target];
        Object.assign(settings.options, { "environment": target });
    }

    if (environments[settings.options.environment]) {
        Object.assign(settings, environments[settings.options.environment]);
    }

    if (typeof settings.options.debug === 'undefined') {
        settings.options.debug = (settings.options.environment !== "production");
    }

    Object.assign(settings, {
        "customConfiguration": fs.readFileSync(config_snippet_path, {"encoding": "utf8"}),
        "loaderHtml": fs.readFileSync(loader_snippet_path, {"encoding": "utf8"}),
        "loaderCss": fs.readFileSync(loader_styling_snippet_path, {"encoding": "utf8"}),
        "customCss": fs.readFileSync(custom_styling_snippet_path, {"encoding": "utf8"})
    });

    return settings;
}
module.exports = compile_settings;