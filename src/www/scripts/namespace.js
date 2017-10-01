"use strict";

export async function get() {
    return await cordova.getAppVersion.getPackageName();
}
