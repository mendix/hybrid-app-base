"use strict";

export async function remove(namespace, key) {
    return await window.localStorage.removeItem(key)
}

export async function set(namespace, key, value) {
    return await window.localStorage.setItem(key, value);
}

export async function get(namespace, key) {
    return await window.localStorage.getItem(key);
}
