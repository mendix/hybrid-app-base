"use strict";

var Emitter = require('tiny-emitter');
var BPromise = require("bluebird");
var TokenStore = require("./Token-store");

var pin = require("./pin");
var pinView = require("./pinView");
var secureStore = require("./secure-store");
var localStore = require("./local-store");

function requireAll(requireContext) {
    return requireContext.keys().map(requireContext);
}

requireAll(require.context("template/styles"));

require("../styles/index.css");
require("../styles/login.css");

module.exports = (function() {
    var defaultConfig = {
            files: {
                js: [ "mxclientsystem/mxui/mxui.js" ],
                css: [
                    "lib/bootstrap/css/bootstrap.min.css",
                    "mxclientsystem/mxui/ui/mxui.css",
                    "css/theme.css"
                ]
            },
            cachebust: +new Date()
        },
        appUrl = "";

    var cacheDirectory;     // throwaway data, like resources.zip
    var resourcesDirectory; // static resources private to app
    var documentDirectory;  // downloaded documents

    var clickType = typeof document.ontouchstart === "undefined" ? "click" : "touchstart";

    var UserVisibleError = function(message) {
        this.message = message;
    };

    UserVisibleError.prototype = new Error();

    var request = function(url, params) {
        var xhr = new XMLHttpRequest(),
            header;

        xhr.open(params.method, url);

        if (params.onLoad) {
            xhr.onreadystatechange = function() {
                if (xhr.readyState !== 4) {
                    return;
                }

                params.onLoad(xhr.status, xhr.responseText);
            };
        }

        for (header in params.headers) {
            if (params.headers.hasOwnProperty(header)) {
                xhr.setRequestHeader(header, params.headers[header]);
            }
        }

        if (params.timeout) {
            xhr.timeout = params.timeout;
            xhr.ontimeout = params.onTimeout;
        }

        xhr.send(params.data);
    };

    var showError = function(message) {
        document.getElementById("mxalert_message").textContent = message;
        document.getElementById("mxalert_button").addEventListener("touchstart", function() {
            window.location.reload();
        });
        document.getElementById("mxalert").style.display = "block";

        hideLoader();
    };

    var messageElement;
    var setProgressMessage = function(message) {
        messageElement = messageElement || document.querySelector("#mx-loader-container .mx-message");
        if (messageElement.textContent != message) {
            messageElement.textContent = message;
        }
    };

    var withProgressMessage = function(fn, message) {
        return function() {
            setProgressMessage(message);
            return fn.apply(null, arguments);
        };
    };

    var pollUntil = function(interval, tries, predicate, resolve, reject) {
        var pollInterval = setInterval(function() {
            if (tries === 0) {
                clearInterval(pollInterval);
                reject();
            } else if (predicate()) {
                clearInterval(pollInterval);
                resolve();
            } else {
                --tries;
            }
        }, interval);
    };

    var createTokenStore = function(requirePin){
        var tokenStore = new TokenStore(requirePin ? secureStore : localStore);

        return {
            set: function(token, callback) {
                tokenStore.set(token).then(callback, callback);
            },
            get: function(callback) {
                tokenStore.get().then(function(token) {
                    if (callback) callback(token);
                }, function(e) {
                    if (callback) callback(undefined);
                });
            },
            remove: function(callback) {
                tokenStore.remove().then(callback, callback);
            }
        }
    };

    var _startup = function(config, url, appUrl, hybridTabletProfile, hybridPhoneProfile, enableOffline, requirePin) {
        return new BPromise(function(resolve, reject) {
            window.dojoConfig = {
                appbase: url,
                remotebase: appUrl,
                baseUrl: url + "mxclientsystem/dojo/",
                async: true,
                cacheBust: config.cachebust,
                hybridTabletProfile: hybridTabletProfile,
                hybridPhoneProfile: hybridPhoneProfile,
                server: {
                    timeout: 5000
                },
                data: {
                    offlineBackend: {
                        getStorageDirFn: function(callback, error) {
                            window.resolveLocalFileSystemURL(documentDirectory, function(dir) {
                                if (callback) callback(dir);
                            }, error);
                        },
                        getDocumentUrlFn: function(fileName, changedDate, isThumb) {
                            var dir = isThumb ? "thumbnails" : "documents";
                            return documentDirectory + "files/" + dir + "/" + fileName + "?" + (+new Date());
                        },
                        downloadFileFn: function(src, dst, callback, error) {
                            var fileTransfer = new FileTransfer();
                            fileTransfer.download(
                                appUrl + src,
                                documentDirectory + "files/" + dst,
                                callback,
                                error
                            );
                        }
                    }
                },
                store: {
                    createStoreFn: function() {
                        return window.sqlitePlugin.openDatabase({ name: "MendixDatabase.db", location: 2 });
                    }
                },
                session: {
                    shouldGenerateToken: true,
                    tokenStore: createTokenStore(requirePin)
                },
                ui: {
                    customLoginFn: function(messageCode) {
                        var loginNode = document.getElementById("mx-login-container");
                        var loginButton = document.getElementById("mx-execute-login");
                        var errorNode = document.getElementById("mx-login-error");

                        if (window.mx.isLoaded()) {
                            var contentNode = document.getElementById("content");
                            contentNode.style.display = "none";
                        }

                        loginNode.style.display = "flex";
                        loginButton.addEventListener(clickType, loginAction);

                        function loginAction() {
                            var loginUsername = document.getElementById("mx-username");
                            var loginPassword = document.getElementById("mx-password");

                            mx.login(loginUsername.value, loginPassword.value, function() {
                                loginNode.style.display = "";
                                loginButton.removeEventListener(clickType, loginAction);
                            }, function(e) {
                                errorNode.textContent = __("We couldn't log you in");
                            });
                        }
                    }
                },
                afterLoginFn: function() {
                    /*
                     * If defined, this function is invoked after sucessful login,
                     * instead of `startup` call. As below, the example can be a PIN
                     * setting page.
                     */

                    if (requirePin) {
                        var configureAndConfirm = function(message) {
                            pinView.configure(message, function(enteredPin) {
                                pinView.confirm(enteredPin, startClient, function() {
                                    configureAndConfirm(__("PIN did not match. Try again!"));
                                });
                            });
                        };

                        configureAndConfirm(__("Set up a PIN"));
                    } else {
                        startClient();
                    }

                    function startClient() {
                        window.mx.isLoaded() ? window.mx.reload() : window.mx.startup();
                    }
                },
                afterNavigationFn: function() {
                    /*
                     * If defined, this function is invoked in onNavigation method,
                     * called as the last action during the startup. Lines below handle
                     * removal of the loading nodes.
                     */
                    removeSelf();
                }
            };

            if (hybridPhoneProfile === "" && hybridTabletProfile === "") {
                window.dojoConfig.offline = enableOffline;
            }

            if (cordova.platformId === "android") {
                window.dojoConfig.ui.openUrlFn = function(url, fileName, windowName) {
                    download(url, cordova.file.externalCacheDirectory + fileName, false, {}, null)
                        .then(function(fe) {
                            cordova.InAppBrowser.open(fe.toURL(), "_system");
                        })
                        .catch(function(e) {
                            window.mx.ui.exception(__("Could not download file"));
                        });
                };
            }

            // When running on webkit we need to inline dynamic images
            // because the session cookie is unavailable for wkwebview
            // and only available in native code.
            if (window.cordova.wkwebview) {
                var sequence = 0;
                window.dojoConfig.data.onlineBackend = {
                    getImgUriFn: function(url, callback, error) {
                        var fileTransfer = new FileTransfer();
                        var tmpFile = cordova.file.tempDirectory  + "img" + (+ new Date()) + "-" + sequence++;

                        // Workaround for issue introduced in 7.0.0, where url was of the wrong type (object instead of string)
                        url = (typeof url === 'string') ? url : url["0"];

                        fileTransfer.download(url, tmpFile, function(fileEntry) {
                            fileEntry.file(function(file) {
                                var reader = new FileReader();
                                reader.onload = function (evt) {
                                    var obj = evt.target.result;
                                    callback(obj);
                                };
                                reader.onerror = error;

                                reader.readAsDataURL(file);
                            }, error);
                        }, error);
                    }
                }
            }

            emitter.emit("onConfigReady", window.dojoConfig);

            // Because loading all app scripts takes quite a while we do that first and defer removing our
            // own styles and scripts until mx exists.  We need to hold on to our own styles as long as we
            // show a progress message.
            addScripts(url, config.cachebust, config.files.js);
            pollUntil(200, 20, function() {
                return typeof mx !== "undefined";
            }, function() {
                if (!isAfterNavigationFnSupported()) {
                    removeSelf();
                }
                addStylesheets(url, config.cachebust, config.files.css);
                replaceEventHandler("backbutton", handleBackButton, handleBackButtonForApp);

                emitter.emit("onClientReady", window.mx);

                resolve();
            }, function() {
                reject(new Error(__("App startup failed")));
            });
        });
    };

    var startupMessage = window.sessionStorage.getItem("refreshData") ? __("Synchronizing...") : __("Starting app...");
    var startup = withProgressMessage(_startup, startupMessage);

    var isAbsolute = function(url) {
        // http://stackoverflow.com/a/19709846
        return /^(?:[a-z]+:)?\/\//i.test(url);
    };

    var isAfterNavigationFnSupported = function() {
        // The afterNavigationFn is supported on mx.version 6.9 and above
        // Versions below 6.8 do not support mx.version api
        return mx.version && !mx.version.startsWith("6.8");
    };

    var addScripts = function(url, cachebust, scripts) {
        var head = document.getElementsByTagName("head")[0];

        scripts.forEach(function(href) {
            var script = document.createElement("script");

            if (isAbsolute(href)) {
                script.src = href;
            } else {
                script.src = url + href + "?" + cachebust;
            }

            head.appendChild(script);
        });
    };

    var addStylesheets = function(url, cachebust, stylesheets) {
        var head = document.getElementsByTagName("head")[0];

        stylesheets.forEach(function(href) {
            var link = document.createElement("link");
            link.rel = "stylesheet";

            if (isAbsolute(href)) {
                link.href = href;
            } else {
                link.href = url + href + "?" + cachebust;
            }

            head.appendChild(link);
        });
    };

    var removeSelf = function() {
        var appNode = document.getElementById("mx-app");
        if (appNode) appNode.parentNode.removeChild(appNode);

        var styleNode = document.querySelector("link[href='css/index.css']");
        if (styleNode) styleNode.parentNode.removeChild(styleNode);
    };

    var hideLoader = function() {
        var loaderNode = document.getElementById("mx-loader-container");
        loaderNode.style.display = "none";
    };

    var getRemoteConfig = function() {
        var attempts = 20,
            configUrl = appUrl + "components.json?" + (+new Date());

        function fetchConfig(callback) {
            request(configUrl, {
                method: "get",
                timeout: 5000,
                onLoad: callback
            });
        }

        return new BPromise(function(resolve, reject) {
            fetchConfig(function(status, result) {
                if (status === 200) {
                    resolve(JSON.parse(result));
                } else if (status === 404) {
                    // If config is not found, assume the default config
                    resolve(defaultConfig);
                } else if (status === 503) {
                    if (--attempts > 0) {
                        // If the app is suspended, wait for it to wake up
                        setTimeout(fetchConfig, 5000);
                    } else {
                        reject();
                    }
                } else {
                    reject();
                }
            });
        });
    };

    var getLocalConfig = function() {
        return new BPromise(function(resolve, reject) {
            request(resourcesDirectory + "components.json?" + (+ new Date()), {
                method: "GET",
                onLoad: function(status, result) {
                    try {
                        if (result) {
                            resolve(JSON.parse(result));
                        } else {
                            reject(new Error(__("components.json is not available or empty")));
                        }
                    } catch (e) {
                        reject(e);
                    }
                }
            });
        });
    };

    var createOnProgressHandler = function(message) {
        return function(progressEvent) {
            var quirkyProgress = progressEvent.lengthComputable === undefined;

            if (progressEvent.lengthComputable || quirkyProgress) {
                var percentage = (progressEvent.loaded / progressEvent.total) * 100;
                setProgressMessage(message + ": " + Math.round(percentage) + "%");
            }
        };
    };

    var download = function(sourceUri, destinationUri, trustAllHosts, options, onprogress) {
        return new BPromise(function(resolve, reject) {
            var fileTransfer = new FileTransfer();
            fileTransfer.onprogress = onprogress;
            fileTransfer.download(sourceUri, destinationUri, resolve, reject, trustAllHosts, options);
        });
    };

    var _downloadAppPackage = function(sourceUri, destinationUri) {
        return download(sourceUri, destinationUri, false, {
            headers: {
                "Accept-Encoding" : ""
            }
        }, createOnProgressHandler(__("Updating app")));
    };

    var downloadAppPackage = withProgressMessage(_downloadAppPackage, __("Updating app..."));

    var removeFile = function(fileUri) {
        return new BPromise(function(resolve, reject) {
            window.resolveLocalFileSystemURI(fileUri, function(fileEntry) {
                fileEntry.remove(resolve, reject);
            }, reject);
        });
    };

    var _removeRecursively = function(directoryUri) {
        return new BPromise(function(resolve, reject) {
            window.resolveLocalFileSystemURI(directoryUri, function(directoryEntry) {
                directoryEntry.removeRecursively(resolve, reject);
            }, function(e) {
                if (e.code !== FileError.NOT_FOUND_ERR) {
                    reject(e);
                } else {
                    resolve();
                }
            });
        });
    };

    var removeRecursively = withProgressMessage(_removeRecursively, __("Optimizing for your device..."));

    var unzip = function(sourceUri, destinationUri) {
        return new BPromise(function(resolve, reject) {
            zip.unzip(sourceUri, destinationUri, function(result) {
                if (result === 0) {
                    resolve();
                } else {
                    reject();
                }
            }, createOnProgressHandler(__("Optimizing for your device")));
        });
    };

    var synchronizePackage = function(sourceUri, destinationUri) {
        function safeUnzip() {
            return unzip(destinationUri, resourcesDirectory)
                .catch(function(e) {
                    removeRecursively(resourcesDirectory);
                    throw e;
                });
        }

        function unpackageWithCleanup() {
            return removeRecursively(resourcesDirectory)
                .then(safeUnzip)
                .then(function() {
                    removeFile(destinationUri);
                }, function(e) {
                    removeFile(destinationUri);
                    throw e;
                });
        }

        function handleFailedDownload(e) {
            return getLocalConfig().caught(function(e) {
                throw new UserVisibleError(
                    __("Could not synchronize with server. Make sure your app has an offline profile enabled when running in offline mode.")
                );
            });
        }

        return downloadAppPackage(sourceUri, destinationUri)
            .then(unpackageWithCleanup, handleFailedDownload);
    };

    var synchronizeResources = function(url, shouldDownloadFn) {
        var sourceUri = encodeURI(url + "resources.zip"),
            destinationUri = cacheDirectory + "resources.zip";

        return getRemoteConfig().then(function(remoteResult) {
            if (shouldDownloadFn(remoteResult)) {
                var wrappedCallback = function() {
                    return BPromise.resolve([ remoteResult, resourcesDirectory ]);
                };

                var synchronize = function() {
                    return synchronizePackage(sourceUri, destinationUri).then(wrappedCallback);
                };

                var synchronizeIfCachebusted = function(result) {
                    if (remoteResult.cachebust == result.cachebust) {
                        return wrappedCallback();
                    } else {
                        return synchronize();
                    }
                };

                return getLocalConfig().then(synchronizeIfCachebusted, synchronize);
            } else {
                return BPromise.resolve([ remoteResult, url ]);
            }
        }, function() {
            return getLocalConfig().then(function(result) {
                return BPromise.resolve([ result, resourcesDirectory ]);
            });
        });
    };

    var setupDirectoryLocations = function() {
        if (cordova.wkwebview) {
            cacheDirectory = cordova.wkwebview.storageDir;
            documentDirectory = cordova.wkwebview.storageDir;
        } else if (cordova.file) {
            cacheDirectory = cordova.file.dataDirectory;
            documentDirectory = cordova.file.externalDataDirectory || cordova.file.dataDirectory;
        } else {
            throw new Error(__("Failed to setup directory locations: unsupported platform"));
        }

        resourcesDirectory = cacheDirectory + "resources/";
    };

    var makeVisibleError = function(e) {
        return (e instanceof UserVisibleError) ? e.message : __("Cannot initialize app.");
    };

    var handleBackButton = function(e) {
        navigator.app.exitApp();
    };

    var handleBackButtonForApp = function(e) {
        if (!window.mx.ui.canMoveBack) {
            // For legacy Mendix versions
            window.history.back();
        } else if (window.mx.ui.canMoveBack()) {
            window.history.back();
        } else if (window.mx.session.destroySession) {
            window.mx.session.destroySession(function() {
                navigator.app.exitApp();
            });
        } else {
            // For legacy Mendix versions
            window.mx.session.logout(function() {
                navigator.app.exitApp();
            });
        }
    };

    var replaceEventHandler = function(eventType, oldHandler, newHandler) {
        if (oldHandler) document.removeEventListener(eventType, oldHandler);
        if (newHandler) document.addEventListener(eventType, newHandler);
    };

    var replaceWindowOpenFn = function() {
        // The client calls mail, call en text links with the window name set
        // to `_self`. This causes a new browser to be opened with the error
        // `UNSUPPORTED_URL_SCHEME`. To circumvent this we are overriding the window.open
        // so the window is set to `_system` which properly handles these schemes.
        window.open = function(strUrl, strWindowName, strWindowFeatures, callbacks) {
            if (/^(mailto:|sms:|tel:)/.test(strUrl)) {
                return cordova.InAppBrowser.open(strUrl, "_system", strWindowFeatures, callbacks)
            } else {
                return cordova.InAppBrowser.open(strUrl, strWindowName, strWindowFeatures, callbacks);
            }
        };
    };

    var initialize = function(url, hybridTabletProfile, hybridPhoneProfile, enableOffline, requirePin) {
        try {
            enableOffline = !!enableOffline;

            // Make sure the url always ends with a /
            appUrl = url.replace(/\/?$/, "/");

            replaceWindowOpenFn();

            document.addEventListener("backbutton", handleBackButton);

            setupDirectoryLocations();

            var shouldDownloadFn = function(config) {
                return config.downloadResources || enableOffline;
            };

            if (requirePin) {
                var tokenStore = new TokenStore(secureStore);

                BPromise.all([ tokenStore.get(), pin.get() ]).spread(function(token, storedPin) {
                    if (token && storedPin) {
                        pinView.verify(syncAndStartup);
                    } else {
                        BPromise.all([ tokenStore.remove(), pin.remove() ]).then(syncAndStartup);
                    }
                });
            } else {
                syncAndStartup();
            }
        } catch (e) {
            handleError(e);
            return;
        }

        function syncAndStartup() {
            synchronizeResources(appUrl, shouldDownloadFn)
                .spread(function(config, resourcesUrl) {
                    return startup(config, resourcesUrl, appUrl, hybridTabletProfile, hybridPhoneProfile, enableOffline, requirePin);
                })
                .catch(handleError);
        }

        function handleError(e) {
            console.error(e);
            showError(makeVisibleError(e));
        }
    };

    var emitter = new Emitter();

    return {
        initialize: initialize,
        onConfigReady: emitter.on.bind(emitter, "onConfigReady"),
        onClientReady: emitter.on.bind(emitter, "onClientReady")
    }
})();
