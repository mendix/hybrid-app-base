var utils = require("./utils");

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
    }

    // Propagate the environment settings
    var environments = utils.loadConfiguration("config/environments.json");

    var target = settings.options.environment;
    if (environmentAliases[target]) {
        target = environmentAliases[target]
        Object.assign(settings.options, { "environment": target });
    }

    if (environments[settings.options.environment]) {
        Object.assign(settings, environments[settings.options.environment]);
    }

    return settings;
}
module.exports = compile_settings;