var MxApp = require("./app.js");

function requireAll(requireContext) {
    return requireContext.keys().map(requireContext);
}

requireAll(require.context("template/styles"));

// Make sure to include the scheme (e.g. http://) in the URL.
document.addEventListener("deviceready", function() {
    MxApp.initialize(URL, ENABLEOFFLINE, REQUIREPIN);
});

module.exports = MxApp;
