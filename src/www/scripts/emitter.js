"use strict";

module.exports = (function() {
    const events = {};

    const Emitter = function() {};

    Emitter.prototype.on = (eventName, callback) => {
        events[eventName] = [...(events[eventName] || []), callback];
        return this;
    }

    Emitter.prototype.emit = async (eventName, ...args) => {
        const callbacks = events[eventName];
        if (callbacks && callbacks.length > 0) {
            return await Promise.all(callbacks.map(callback => callback(...args)));
        }
        return Promise.resolve();
    }

    return Emitter;
})();
