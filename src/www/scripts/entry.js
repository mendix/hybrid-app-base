import * as MxApp from "./app";
import * as Settings from "./settings";

// Make sure to include the scheme (e.g. http://) in the URL.
document.addEventListener("deviceready", function() {
    Settings.loadJSON("settings.json", async function (response) {
        const settings = JSON.parse(response);
        await MxApp.initialize(settings.url,
            settings.hybridTabletProfile, settings.hybridPhoneProfile,
            settings.enableOffline, settings.requirePin,
            settings.username, settings.password);
    });
});

module.exports = MxApp;
