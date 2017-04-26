var MxApp = require("./app");
var Settings = require("./settings");

function requireAll(requireContext) {
    return requireContext.keys().map(requireContext);
}

requireAll(require.context("template/styles"));

// Make sure to include the scheme (e.g. http://) in the URL.
document.addEventListener("deviceready", function() {
    Settings.loadJSON("settings.json", function (response) {
        var settings = JSON.parse(response);
        MxApp.initialize(settings.url, settings.hybridTabletProfile, settings.hybridPhoneProfile,
            settings.enableOffline, settings.requirePin);
    });
});

module.exports = MxApp;
