"use strict";

const storagePromises = {};

function _getStorage(namespace) {
    if (!storagePromises[namespace]) {
        storagePromises[namespace] = new Promise(function (resolve, reject) {
            const storage = new cordova.plugins.SecureStorage(function () {
                resolve(storage);
            }, reject, namespace);
        });
    }

    return storagePromises[namespace];
}

export async function remove(namespace, key) {
    const storage = await _getStorage(namespace);

    return new Promise(function (resolve, reject) {
        storage.remove(resolve, reject, key);
    });
}

export async function set(namespace, key, value) {
    const storage = await _getStorage(namespace);

    return new Promise(function (resolve, reject) {
        storage.set(resolve, reject, key, value);
    });
}

export async function get(namespace, key) {
    const storage = await _getStorage(namespace);

    return new Promise(function (resolve, reject) {
        storage.get(resolve, reject, key);
    });
}
