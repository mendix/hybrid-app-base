"use strict";

export default (function () {
    var remove = function (namespace, key) {
        return new Promise(function (resolve, reject) {
            window.resolveLocalFileSystemURL(
                cordova.file.dataDirectory,
                function (fs) {
                    fs.getFile(
                        ".mx-token",
                        { create: false },
                        function (fileEntry) {
                            fileEntry.remove(resolve, reject, resolve);
                        },
                        reject
                    );
                },
                reject
            );
        });
    };

    var set = function (namespace, key, value) {
        return new Promise(function (resolve, reject) {
            window.resolveLocalFileSystemURL(
                cordova.file.dataDirectory,
                function (fs) {
                    fs.getFile(
                        ".mx-token",
                        { create: true, exclusive: false },
                        function (fileEntry) {
                            fileEntry.createWriter(function (fileWriter) {
                                fileWriter.onerror = reject;
                                fileWriter.onwriteend = function () {
                                    fileWriter.onwriteend = resolve;
                                    fileWriter.write(value);
                                };
                                fileWriter.truncate(0);
                            });
                        },
                        reject
                    );
                },
                reject
            );
        });
    };

    var get = function (namespace, key) {
        return new Promise(function (resolve, reject) {
            window.resolveLocalFileSystemURL(
                cordova.file.dataDirectory,
                function (fs) {
                    console.log("file system open: " + fs.name);
                    fs.getFile(
                        ".mx-token",
                        { create: false },
                        function (fileEntry) {
                            fileEntry.file(function (file) {
                                var reader = new FileReader();

                                reader.onloadend = function () {
                                    resolve(this.result);
                                };

                                reader.readAsText(file);
                            }, reject);
                        },
                        reject
                    );
                },
                reject
            );
        });
    };

    return {
        set: set,
        get: get,
        remove: remove,
    };
})();
