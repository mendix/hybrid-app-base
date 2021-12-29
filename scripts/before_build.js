#!/usr/bin/env node

require("fs").copyFileSync("./config/build-extras.gradle", "./platforms/android/app/build-extras.gradle");
