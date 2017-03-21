"use strict";

var BPromise = require("bluebird");

module.exports = (function() {
    var tokenKey = "mx-authtoken";

    var TokenStore = function(store) {
        this._store = store;
    };

    TokenStore.prototype.set = function(tokenValue) {
        return getNamespace().then(function(storageNamespace) {
            return this._store.set(storageNamespace, tokenKey, tokenValue);
        }.bind(this));
    };

    TokenStore.prototype.get = function() {
        return getNamespace().then(function(storageNamespace) {
            return this._store.get(storageNamespace, tokenKey).caught(function() {
                return BPromise.resolve(undefined);
            });
        }.bind(this));
    };

    TokenStore.prototype.remove = function() {
        return getNamespace().then(function(storageNamespace) {
            return this._store.remove(storageNamespace, tokenKey).caught(function() {
                return BPromise.resolve();
            });
        }.bind(this));
    };

    var getNamespace = function() {
        return new BPromise(function(resolve, reject) {
            return cordova.getAppVersion.getPackageName(resolve);
        });
    };

    return TokenStore;
})();