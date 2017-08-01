"use strict";

var secureStore = require("./secure-store");
var namespace = require("./namespace");

var pinKey = "pin";

module.exports = (function() {
    var removePin = function() {
        return namespace.get().then(function(storageNamespace) {
            return Promise.all([
                secureStore.remove(storageNamespace, pinKey),
                clearAttemptsLeft()
            ]).caught(function() {
                return Promise.resolve();
            });
        });
    };

    var setPin = function(pinValue) {
        return namespace.get().then(function(storageNamespace) {
            return secureStore.set(storageNamespace, pinKey, pinValue).caught(function() {
                return Promise.resolve();
            });
        });
    };

    var getPin = function() {
        return namespace.get().then(function(storageNamespace) {
            return secureStore.get(storageNamespace, pinKey).caught(function() {
                return Promise.resolve(undefined);
            });
        });
    };

    var getAttemptsLeft = function() {
        return namespace.get().then(function(storageNamespace) {
            return secureStore.get(storageNamespace, "mx-pin-attempts-left").then(function(strAttemptsLeft) {
                return Number(strAttemptsLeft);
            });
        }).caught(function() {
            return Promise.resolve(3);
        });
    };

    var setAttemptsLeft = function(attempts) {
        return namespace.get().then(function(storageNamespace) {
            return secureStore.set(storageNamespace, "mx-pin-attempts-left", attempts.toString());
        });
    };

    var clearAttemptsLeft = function() {
        return namespace.get().then(function(storageNamespace) {
            return secureStore.remove(storageNamespace, "mx-pin-attempts-left").caught(function() {
                return Promise.resolve();
            });
        });
    };

    var verify = function(enteredPin) {
        return getPin().then(function(storedPin) {
            if (enteredPin === storedPin) {
                return clearAttemptsLeft();
            } else {
                return getAttemptsLeft().then(function(attemptsLeft) {
                    return setAttemptsLeft(--attemptsLeft).then(function() {
                        return Promise.reject(new Error(__("Invalid PIN")));
                    });
                });
            }
        });
    };

    var isValid = function(pin) {
        return /^[0-9]{5}$/.test(pin);
    };

    return {
        set: setPin,
        get: getPin,
        remove: removePin,
        getAttemptsLeft: getAttemptsLeft,
        verify: verify,
        isValid: isValid
    }
})();