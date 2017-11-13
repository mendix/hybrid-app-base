const MxApp = require("./app");
const Settings = require("./settings");

// Make sure to include the scheme (e.g. http://) in the URL.
document.addEventListener("deviceready", function() {
    Settings.loadJSON("settings.json", function (response) {
        let settings = JSON.parse(response);
        MxApp.initialize(settings.url,
            settings.enableOffline, settings.requirePin,
            settings.username, settings.password,
            settings.updateAsync);
    });
});

module.exports = MxApp;
