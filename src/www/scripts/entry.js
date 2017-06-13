var MxApp = require("./app");
var Settings = require("./settings");

// Make sure to include the scheme (e.g. http://) in the URL.
document.addEventListener("deviceready", function() {
    Settings.loadJSON("settings.json", function (response) {
        var settings = JSON.parse(response);
        MxApp.initialize(settings.url, settings.enableOffline, settings.requirePin);
    });
});

module.exports = MxApp;
