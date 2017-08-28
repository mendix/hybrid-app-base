"use strict";

module.exports = (function() {
    var getNamespace = function() {
        return new Promise(function(resolve, reject) {
            return cordova.getAppVersion.getPackageName(resolve);
        });
    };

    return {
        get: getNamespace
    }
})();