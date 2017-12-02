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

- Recent `Node.js`. This code was tested with versions 6 and 8. You can check your installed version by running `node -v`.
    - Windows: install from [nodejs.org](https://nodejs.org/en/download/)
    - MacOS: use [Brew](https://brew.sh/) to install `Node.js`: `brew install node`
    - Linux, BSD, etc: install using the available package manager, e.g. on Debian: `sudo apt-get install node`

### Build

```
$ npm install                       # install dependencies
$ npm run appbase                   # create templated PGB package in `dist`
```