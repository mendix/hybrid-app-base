"use strict";

var BPromise = require("bluebird");

module.exports = (function() {
    var getNamespace = function() {
        return new BPromise(function(resolve, reject) {
            return cordova.getAppVersion.getPackageName(resolve);
        });
    };

    return {
        get: getNamespace
    }
})();