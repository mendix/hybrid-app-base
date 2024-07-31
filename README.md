# Mendix PhoneGap / Cordova hybrid app base package

This repository contains the core files needed to build a Phonegap package for your Mendix application.
It consists of two main parts:

- The core source files for the hybrid app
- The webpack configuration that is used during the build process

You should not use this package directly.
Instead, refer to the [Mendix PhoneGap / Cordova hybrid app template](https://github.com/mendix/hybrid-app-template/) for instructions on how to customize and build your Mendix hybrid mobile app.

## Building a templated Phonegap Build package

This project can be used to create a templated Phonegap Build package, as used within the Mobile Publish flow of the Mendix Portal.

### Prerequisites

- Recent `Node.js`. This code was tested with version 20. You can check by running `node -v`.
    - Windows: install from [nodejs.org](https://nodejs.org/en/download/)
    - MacOS: use [Brew](https://brew.sh/) to install `Node.js`: `brew install node`
    - Linux, BSD, etc: install using the available package manager, e.g. on Debian: `sudo apt-get install node`
- To customize the runtime behavior, include the following configuration: Set [com.mendix.core.SameSiteCookies](https://docs.mendix.com/refguide/custom-settings/#commendixcoreSameSiteCookies) to `None` in Studio Pro.
- Deploy and test the application using HTTPS.
- The scheme configuration in `config.xml` should not be changed to any value other than `app` for iOS.

### Build

```
$ npm install                       # install dependencies
$ npm run appbase                   # create templated PGB package in `dist`
```

## Mendix-specific forks of Cordova/Phonegap plugins

Mendix hybrid apps include a number of plugins by default.
These plugins have been created by the Cordova/Phonegap community.
For some of these plugins, we have created Mendix-specific forks.
The reason for creating a fork varies per plugin.
The list below outlines the details per forked plugin.

### cordova-plugin-wkwebview-engine

- [Original repository](https://github.com/apache/cordova-plugin-wkwebview-engine)
- [Forked library](https://www.npmjs.com/package/@mendix/cordova-plugin-wkwebview-engine-mx) (code is in internal repository)

We implemented XHR request handling using native code, while keeping support for cookies.

### cordova-sqlite-storage

- [Original repository](https://github.com/litehelpers/Cordova-sqlite-storage)
- [Forked repository](https://github.com/mendix/Cordova-sqlite-storage-pgb)

We included the SQLite native libraries.

### phonegap-launch-navigator

- [Original repository](https://github.com/dpa99c/phonegap-launch-navigator)
- [Forked repository](https://github.com/mendix/phonegap-launch-navigator)

We added support for cordova-android 7+.

### phonegap-plugin-push

- [Original repository](https://github.com/phonegap/phonegap-plugin-push)
- [Forked repository](https://github.com/mendix/phonegap-plugin-push)

We unpinned the version of the Android support v13 library.

### cordova-plugin-secure-storage

- [Original repository](https://github.com/Crypho/cordova-plugin-secure-storage)
- [Forked library](https://github.com/mendix/cordova-plugin-secure-storage)

We added support for Android 10
