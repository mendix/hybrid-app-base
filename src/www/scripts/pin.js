"use strict";

import * as SecureStore from "./secure-store";
import * as Namespace from "./namespace";

const PINKEY = "mx-pin";
const PINATTEMPTSLEFTKEY = "mx-pin-attempts-left";

export async function remove() {
    const storageNamespace = await Namespace.get();

    try {
        await Promise.all([
            SecureStore.remove(storageNamespace, PINKEY),
            clearAttemptsLeft()
        ])
    } catch(e) {}
}

export async function set(pinValue) {
    const storageNamespace = await Namespace.get();

    try {
        await SecureStore.set(storageNamespace, PINKEY, pinValue);
    } catch(e) {}
}

export async function get() {
    const storageNamespace = await Namespace.get();

    try {
        return await SecureStore.get(storageNamespace, PINKEY);
    } catch(e) {
        return undefined;
    }
}

export async function getAttemptsLeft() {
    const storageNamespace = await Namespace.get();

    try {
        const strAttemptsLeft = await SecureStore.get(storageNamespace, PINATTEMPTSLEFTKEY);
        return Number(strAttemptsLeft);
    } catch(e) {
        return 3;
    }
}

async function setAttemptsLeft(attempts) {
    const storageNamespace = await Namespace.get();

    await SecureStore.set(storageNamespace, PINATTEMPTSLEFTKEY, attempts.toString());
}

async function clearAttemptsLeft() {
    const storageNamespace = await Namespace.get();

    try {
        await SecureStore.remove(storageNamespace, PINATTEMPTSLEFTKEY);
    } catch(e) {}
}

export async function verify(enteredPin) {
    const storedPin = await get();

    if (enteredPin === storedPin) {
        await clearAttemptsLeft();
    } else {
        const attemptsLeft = await getAttemptsLeft();
        await setAttemptsLeft(attemptsLeft-1);
        throw new Error(__("Invalid PIN"));
    }
}

export function isValid(pin) {
    return /^[0-9]{5}$/.test(pin);
}
