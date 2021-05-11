"use strict";

export default (function () {
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
            return this._store.get(storageNamespace, tokenKey).catch(function() {
                return Promise.resolve(undefined);
            });
        }.bind(this));
    };

    TokenStore.prototype.remove = function() {
        return getNamespace().then(function(storageNamespace) {
            return this._store.remove(storageNamespace, tokenKey).catch(function() {
                return Promise.resolve();
            });
        }.bind(this));
    };

    var getNamespace = function() {
        return new Promise(function(resolve, reject) {
            return cordova.getAppVersion.getPackageName(resolve);
        });
    };

    return TokenStore;
})();