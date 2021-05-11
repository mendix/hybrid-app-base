"use strict";

export default (function () {
    const events = {};

    const Emitter = function() {};

    Emitter.prototype.on = (eventName, callback) => {
        events[eventName] = [...(events[eventName] || []), callback];
        return this;
    }

    Emitter.prototype.emit = async (eventName, ...args) => {
        const callbacks = events[eventName] || [];
        return await Promise.all(callbacks.map(callback => callback(...args)));
    }

    return Emitter;
})();
