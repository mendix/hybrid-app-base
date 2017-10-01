/*global window, mx, FileTransfer, cordova, require, module, __ */

"use strict";
import "babel-polyfill";

const Emitter = require('tiny-emitter');

import TokenStore from "./token-store";

import * as Pin from "./pin";
import * as PinView from "./pin-view";
import * as SecureStore from "./secure-store";
import * as LocalStore from "./local-store";

function requireAll(requireContext) {
    return requireContext.keys().map(requireContext);
}

requireAll(require.context("template/styles"));

require("../styles/index.css");
require("../styles/login.css");

const emitter = new Emitter();

const defaultConfig = {
    files: {
        js: [ "mxclientsystem/mxui/mxui.js" ],
        css: [
            "lib/bootstrap/css/bootstrap.min.css",
            "mxclientsystem/mxui/ui/mxui.css",
            "css/theme.css"
        ]
    },
    cachebust: +new Date()
};

let appUrl = "";

let cacheDirectory;     // throwaway data, like resources.zip
let resourcesDirectory; // static resources private to app
let documentDirectory;  // downloaded documents

const clickType = typeof document.ontouchstart === "undefined" ? "click" : "touchstart";

const UserVisibleError = function(message) {
    this.message = message;
};

UserVisibleError.prototype = new Error();

const request = function(url, params) {
    const xhr = new XMLHttpRequest();

    xhr.open(params.method, url);

    if (params.onLoad) {
        xhr.onreadystatechange = function() {
            if (xhr.readyState !== 4) {
                return;
            }

            params.onLoad(xhr.status, xhr.responseText);
        };
    }

    for (let header in params.headers) {
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

const showError = function(message, callback) {
    document.getElementById("mxalert_message").textContent = message;
    document.getElementById("mxalert_button").addEventListener("touchstart", function() {
        if (typeof callback === "function") {
            document.getElementById("mxalert").style.display = "none";
            callback();
        } else {
            window.location.reload();
        }
    });
    document.getElementById("mxalert").style.display = "block";

    hideLoader();
};

let messageElement;
const setProgressMessage = function(message) {
    messageElement = messageElement || document.querySelector("#mx-loader-container .mx-message");
    if (messageElement.textContent !== message) {
        messageElement.textContent = message;
    }
};

const withProgressMessage = function(fn, message) {
    return function() {
        setProgressMessage(message);

        let appNode = document.getElementById("mx-app");
        if (appNode) appNode.style.display = "block";

        let loaderNode = document.getElementById("mx-loader-container");
        if (loaderNode) loaderNode.style.display = "table";

        return fn.apply(null, arguments);
    };
};

const pollUntil = function(interval, tries, predicate, resolve, reject) {
    let pollInterval = setInterval(function() {
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

const createTokenStore = function(requirePin){
    const tokenStore = new TokenStore(requirePin === true ? SecureStore : LocalStore);

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

const _startup = function(config, url, appUrl, hybridTabletProfile, hybridPhoneProfile, enableOffline, requirePin) {
    return new Promise(function(resolve, reject) {
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
                        const dir = isThumb ? "thumbnails" : "documents";
                        return documentDirectory + "files/" + dir + "/" + fileName + "?" + (+new Date());
                    },
                    downloadFileFn: function(src, dst, callback, error) {
                        const fileTransfer = new FileTransfer();
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
                    let db = window.sqlitePlugin.openDatabase({ name: "MendixDatabase.db", location: 2 });

                    window.onbeforeunload = function(e) {
                        db.close(function () {
                            console.log("DB closed!");
                        }, function (error) {
                            console.log("Error closing DB: " + error.message);
                        });
                    };

                    return db;
                }
            },
            session: {
                shouldGenerateToken: true,
                tokenStore: createTokenStore(requirePin)
            },
            ui: {
                customLoginFn: function(messageCode) {
                    let loginNode = document.getElementById("mx-login-container");
                    let loginButton = document.getElementById("mx-execute-login");
                    let errorNode = document.getElementById("mx-login-error");

                    if (window.mx.isLoaded()) {
                        let contentNode = document.getElementById("content");
                        contentNode.style.display = "none";
                    }

                    loginNode.style.display = "flex";
                    loginButton.addEventListener(clickType, loginAction);

                    function loginAction() {
                        let loginUsername = document.getElementById("mx-username");
                        let loginPassword = document.getElementById("mx-password");

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
                    let configureAndConfirm = function(message) {
                        PinView.configure(message, function(enteredPin) {
                            PinView.confirm(enteredPin, startClient, function() {
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
            let sequence = 0;
            window.dojoConfig.data.onlineBackend = {
                getImgUriFn: function(url, callback, error) {
                    let fileTransfer = new FileTransfer();
                    let tmpFile = cordova.file.tempDirectory  + "img" + (+ new Date()) + "-" + sequence++;

                    // Workaround for issue introduced in 7.0.0, where url was of the wrong type (object instead of string)
                    url = (typeof url === 'string') ? url : url["0"];

                    fileTransfer.download(url, tmpFile, function(fileEntry) {
                        fileEntry.file(function(file) {
                            let reader = new FileReader();
                            reader.onload = function (evt) {
                                let obj = evt.target.result;
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

const startupMessage = window.sessionStorage.getItem("refreshData") ? __("Synchronizing...") : __("Starting app...");
const startup = withProgressMessage(_startup, startupMessage);

const isAbsolute = function(url) {
    // http://stackoverflow.com/a/19709846
    return /^(?:[a-z]+:)?\/\//i.test(url);
};

const isAfterNavigationFnSupported = function() {
    // The afterNavigationFn is supported on mx.version 6.9 and above
    // Versions below 6.8 do not support mx.version api
    return mx.version && !mx.version.startsWith("6.8");
};

const addScripts = function(url, cachebust, scripts) {
    let head = document.getElementsByTagName("head")[0];

    scripts.forEach(function(href) {
        let script = document.createElement("script");

        if (isAbsolute(href)) {
            script.src = href;
        } else {
            script.src = url + href + "?" + cachebust;
        }

        head.appendChild(script);
    });
};

const addStylesheets = function(url, cachebust, stylesheets) {
    let head = document.getElementsByTagName("head")[0];

    stylesheets.forEach(function(href) {
        let link = document.createElement("link");
        link.rel = "stylesheet";

        if (isAbsolute(href)) {
            link.href = href;
        } else {
            link.href = url + href + "?" + cachebust;
        }

        head.appendChild(link);
    });
};

const removeSelf = function() {
    let appNode = document.getElementById("mx-app");
    if (appNode) appNode.style.display = "none";
};

const hideLoader = function() {
    let loaderNode = document.getElementById("mx-loader-container");
    loaderNode.style.display = "none";
};

const getRemoteConfig = function() {
    let attempts = 20,
        configUrl = appUrl + "components.json?" + (+new Date());

    function fetchConfig(callback) {
        request(configUrl, {
            method: "get",
            timeout: 5000,
            onLoad: callback
        });
    }

    return new Promise(function(resolve, reject) {
        let cb = function(status, result) {
            if (status === 200) {
                resolve(JSON.parse(result));
            } else if (status === 404) {
                // If config is not found, assume the default config
                resolve(defaultConfig);
            } else if (status === 503) {
                if (--attempts > 0) {
                    // If the app is suspended, wait for it to wake up
                    setTimeout(fetchConfig, 5000, cb);
                } else {
                    reject();
                }
            } else {
                reject();
            }
        };

        fetchConfig(cb);
    });
};

const getLocalConfig = function() {
    return new Promise(function(resolve, reject) {
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

const createOnProgressHandler = function(message) {
    return function(progressEvent) {
        let quirkyProgress = progressEvent.lengthComputable === undefined;

        if (progressEvent.lengthComputable || quirkyProgress) {
            let percentage = (progressEvent.loaded / progressEvent.total) * 100;
            setProgressMessage(message + ": " + Math.round(percentage) + "%");
        }
    };
};

const download = function(sourceUri, destinationUri, trustAllHosts, options, onprogress) {
    return new Promise(function(resolve, reject) {
        var fileTransfer = new FileTransfer();
        fileTransfer.onprogress = onprogress;
        fileTransfer.download(sourceUri, destinationUri, resolve, reject, trustAllHosts, options);
    });
};

const _downloadAppPackage = function(sourceUri, destinationUri) {
    return download(sourceUri, destinationUri, false, {
        headers: {
            "Accept-Encoding" : ""
        }
    }, createOnProgressHandler(__("Updating app")));
};

const downloadAppPackage = withProgressMessage(_downloadAppPackage, __("Updating app..."));

const removeFile = function(fileUri) {
    return new Promise(function(resolve, reject) {
        window.resolveLocalFileSystemURI(fileUri, function(fileEntry) {
            fileEntry.remove(resolve, reject);
        }, reject);
    });
};

const _removeRecursively = function(directoryUri) {
    return new Promise(function(resolve, reject) {
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

const removeRecursively = withProgressMessage(_removeRecursively, __("Optimizing for your device..."));

const unzip = function(sourceUri, destinationUri) {
    return new Promise(function(resolve, reject) {
        zip.unzip(sourceUri, destinationUri, function(result) {
            if (result === 0) {
                resolve();
            } else {
                reject();
            }
        }, createOnProgressHandler(__("Optimizing for your device")));
    });
};

const synchronizePackage = function(sourceUri, destinationUri) {
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
        return getLocalConfig().catch(function(e) {
            throw new UserVisibleError(
                __("Could not synchronize with server. Make sure your app has an offline profile enabled when running in offline mode.")
            );
        });
    }

    return downloadAppPackage(sourceUri, destinationUri)
        .then(unpackageWithCleanup, handleFailedDownload);
};

const synchronizeResources = async function(url, enableOffline, shouldDownloadFn) {
    const sourceUri = encodeURI(url + "resources.zip");
    const destinationUri = cacheDirectory + "resources.zip";

    if (enableOffline) {
        try {
            const localResult = await getLocalConfig();

            getRemoteConfig().then((remoteResult) => {
                let updateConfig = async (buttonIndex) => {
                    await synchronizePackage(sourceUri, destinationUri);
                    window.location.reload();
                };

                if (remoteResult.cachebust !== localResult.cachebust) {
                    if (onAppUpdateAvailableFn) {
                        onAppUpdateAvailableFn(updateConfig);
                    } else {
                        navigator.notification.confirm(__("An update is ready. Do you want to download it? (this may take a few moments)"),
                            (buttonIndex) => buttonIndex === 1 && updateConfig(),
                            __("Update ready"),
                            [__("Yes"), __("No, update later")]
                        );
                    }
                }
            }).catch((e) => {
                console.log('Unable to retrieve components.json');
            });

            return [ localResult, resourcesDirectory];
        } catch (e) {
            const remoteResult = await getRemoteConfig();

            await synchronizePackage(sourceUri, destinationUri);
            return [ remoteResult, resourcesDirectory ];
        }
    } else {
        let remoteResult = await getRemoteConfig();

        if (shouldDownloadFn(remoteResult)) {
            await synchronizePackage(sourceUri, destinationUri);
            return [ remoteResult, resourcesDirectory ];
        } else {
            return [ remoteResult, url ];
        }
    }
};

const setupDirectoryLocations = function() {
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

const makeVisibleError = function(e) {
    return (e instanceof UserVisibleError) ? e.message : __("Cannot initialize app.");
};

const handleBackButton = function(e) {
    navigator.app.exitApp();
};

const handleBackButtonForApp = function(e) {
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

const replaceEventHandler = function(eventType, oldHandler, newHandler) {
    if (oldHandler) document.removeEventListener(eventType, oldHandler);
    if (newHandler) document.addEventListener(eventType, newHandler);
};

const replaceWindowOpenFn = function() {
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

const credentialsProvided = function(username, password) {
    return (
        typeof username !== 'undefined' &&
        username.length > 0 &&
        typeof password !== 'undefined' &&
        password.length > 0
    );
};

export const initialize = async function(url, hybridTabletProfile, hybridPhoneProfile, enableOffline, requirePin, username, password) {
    enableOffline = !!enableOffline;

    // Make sure the url always ends with a /
    appUrl = url.replace(/\/?$/, "/");

    const localTokenStore = new TokenStore(LocalStore);
    const secureTokenStore = requirePin ? new TokenStore(SecureStore) : undefined;

    const shouldDownloadFn = function(config) {
        return config.downloadResources || enableOffline;
    };

    const reflect = function(promise){
        return promise.then(function(v){ return {v:v, status: "resolved" }},
            function(e){ return {e:e, status: "rejected" }});
    };

    const cleanUpRemains = async function() {
        try {
            await reflect(localTokenStore.remove());
            await reflect(secureTokenStore.remove());
            await reflect(Pin.remove());
            await new Promise(function(resolve) {
                window.cookies.clear(resolve());
            });
        } catch(e) {
            console.info("Could not clean remaining session data; maybe they were already removed: ", e ? e : "no details");
        }
    };

    const syncAndStartup = async function() {
        try {
            const [config, resourcesUrl] = await synchronizeResources(appUrl, enableOffline, shouldDownloadFn);
            await startup(config, resourcesUrl, appUrl, hybridTabletProfile, hybridPhoneProfile, enableOffline, requirePin);
        } catch(e) {
            await handleError(e ? e : new Error("Failed to sync and startup."));
        }
    };

    const handleError = function(e) {
        return new Promise(function(resolve) {
            console.error(e);
            showError(makeVisibleError(e), resolve);
        });
    };

    document.addEventListener("backbutton", handleBackButton);

    replaceWindowOpenFn();
    setupDirectoryLocations();

    if (credentialsProvided(username, password)) {
        try {
            await cleanUpRemains();
            await createSessionWithCredentials(appUrl, username, password);
        } catch (e) {
            await handleError(e ? e : new Error("Failed to create session with provided credentials."));

            window.location.reload();
        }
    } else if (requirePin) {
        try {
            const token = await secureTokenStore.get();
            const pinValue = await Pin.get();

            if (token && pinValue) {
                await PinView.verify();
            } else {
                await cleanUpRemains();
            }
        } catch (e) {
            await cleanUpRemains();
        }
    }

    try {
        await syncAndStartup();
    } catch(e) {
        await handleError(e ? e : new Error("Failed to sync and startup."));

        window.location.reload();
    }
};

const createSessionWithCredentials = function(url, username, password) {
    let loginUrl = url + 'xas/';
    let attempts = 20;

    if (!credentialsProvided(username, password)) {
        throw new Error("Missing username and/or password");
    }

    function doLoginRequest(callback) {
        request(loginUrl, {
            timeout: 5000,
            onLoad: callback,
            method: "post",
            headers: { "Content-Type": "application/json" },
            data: JSON.stringify({
                action : "login",
                params : {
                    username: username,
                    password: password
                }
            })
        });
    }

    return new Promise(function(resolve, reject) {
        let cb = function(status, result) {
            if (status === 200) {
                resolve();
            } else if (status === 503) {
                if (--attempts > 0) {
                    // If the app is suspended, wait for it to wake up
                    setTimeout(doLoginRequest, 5000, cb);
                } else {
                    reject(new UserVisibleError("Failed to log in: app is not running"));
                }
            } else {
                reject(new UserVisibleError("Failed to log in"));
            }
        };

        doLoginRequest(cb);
    });
};

let onAppUpdateAvailableFn;

export const onConfigReady = emitter.on.bind(emitter, "onConfigReady");
export const onClientReady = emitter.on.bind(emitter, "onClientReady");
export const onAppUpdateAvailable = (fn) => {onAppUpdateAvailableFn = fn};
