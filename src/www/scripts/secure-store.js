"use strict";

var namespacePromises = {};

module.exports = (function() {
    var getStorage = function(namespace) {
        if (!namespacePromises[namespace]) {
            namespacePromises[namespace] = new Promise(function (resolve, reject) {
                var storage = new cordova.plugins.SecureStorage(function () {
                    resolve(storage);
                }, reject, namespace);
            });
        }

        return namespacePromises[namespace];
    };

    var remove = function(namespace, key) {
        return getStorage(namespace).then(function (storage) {
            return new Promise(function (resolve, reject) {
                storage.remove(resolve, reject, key);
            });
        });
    };

    var set = function(namespace, key, value) {
        return getStorage(namespace).then(function (storage) {
            return new Promise(function (resolve, reject) {
                storage.set(resolve, reject, key, value);
            });
        });
    };

    var get = function(namespace, key) {
        return getStorage(namespace).then(function (storage) {
            return new Promise(function (resolve, reject) {
                storage.get(resolve, reject, key);
            });
        });
    };

    return {
        set: set,
        get: get,
        remove: remove
    };
})();


