"use strict";

module.exports = (function() {
    var remove = function(namespace, key) {
        return window.localStorage.removeItem(key)
    };

    var set = function(namespace, key, value) {
        return window.localStorage.setItem(key, value);
    };

    var get = function(namespace, key) {
        return Promise.resolve(window.localStorage.getItem(key));
    };

    return {
        set: set,
        get: get,
        remove: remove
    }
})();
