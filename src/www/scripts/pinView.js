/* global __ */
"use strict";

import Pin from "./pin";

const clickType = typeof document.ontouchstart === "undefined" ? "click" : "touchstart";
let changeKeyboardToPassword;

const pinNode = document.getElementById("mx-pin-container");
const errorNode = document.getElementById("mx-pin-error");
const confirmPinButton = document.getElementById("mx-confirm-pin");
const forgotPinButton = document.getElementById("mx-forgot-pin");
const userInput = document.querySelectorAll("#mx-pin-container input");

userInput.forEach(input => input.type = cordova.platformId == "android" ? "number" : "tel"); 

export function verify () {
    return new Promise((resolve, reject) => {
        updateErrorText(__("Verify your PIN"));

        addMoveInputListeners(pinNode);
        cleanUserInput();

        confirmPinButton.addEventListener(clickType, verifyPinAction);
        forgotPinButton.addEventListener(clickType, forgetPinAction);

        forgotPinButton.style.display = "";
        pinNode.style.display = "flex";

        async function verifyPinAction() {
            try {
                await Pin.verify(getEnteredPin());
                closeView();
                resolve();
            } catch(err) {
                let attemptsLeft = await Pin.getAttemptsLeft();
                if (attemptsLeft === 0) {
                    forgetPinAction();
                } else {
                    updateErrorText(__("Invalid PIN"));
                    cleanUserInput();
                }
            }
        }

        function forgetPinAction() {
            closeView();
            reject(new Error("Pin verification failed."));
        }

        function closeView() {
            removeMoveInputListeners(pinNode);
            confirmPinButton.removeEventListener(clickType, verifyPinAction);
            forgotPinButton.removeEventListener(clickType, forgetPinAction);

            pinNode.style.display = "";
        }
    });
}

export function configure(message, callback) {
    updateErrorText(message);
    addMoveInputListeners(pinNode);

    cleanUserInput();

    forgotPinButton.style.display = "none";
    pinNode.style.display = "flex";

    confirmPinButton.addEventListener(clickType, validatePin);

    function validatePin() {
        const userPin = getEnteredPin();

        if (Pin.isValid(userPin)) {
            confirmPinButton.removeEventListener(clickType, validatePin);
            removeMoveInputListeners(pinNode);

            pinNode.style.display = "";

            if (callback) callback(userPin);
        } else {
            errorNode.textContent = __("The PIN you have submitted is invalid");
        }
    }
}

export function confirm(pinToConfirm, callback, error) {
    errorNode.textContent = __("Confirm your PIN");
    addMoveInputListeners(pinNode);

    cleanUserInput();

    forgotPinButton.style.display = "none";
    pinNode.style.display = "flex";

    confirmPinButton.addEventListener(clickType, validateAndStorePin);

    function removeSelf() {
        confirmPinButton.removeEventListener(clickType, validateAndStorePin);
        removeMoveInputListeners(pinNode);

        pinNode.style.display = "";
    }

    function validateAndStorePin() {
        const userPin = getEnteredPin();

        if (userPin === pinToConfirm) {
            Pin.set(userPin).then(function() {
                removeSelf();

                if (callback) callback();
            });
        } else {
            removeSelf();

            if (error) error(new Error(__("PIN did not match")));
        }
    }
}

function getEnteredPin() {
    return [].slice.call(userInput).map(function (element) {
        return element.value;
    }).join("");
}

function updateErrorText(message) {
    Pin.getAttemptsLeft().then(function(attemptsLeft) {
        errorNode.textContent = message;
        if (attemptsLeft === 1) {
            errorNode.textContent += ". " + __("You have one more attempt");
        }
    });
}

function moveInputForward(e) {
    const target = e.target;

    if (!/^[0-9]$/.test(target.value)) {
        target.value = "";
    }

    if (target.value.length >= 1) {
        target.value = target.value[0];
        // We would like to have visual feedback of the typed number
        // rather than changing to star immediately
        changeKeyboardToPassword = setTimeout(function() {
            hidePinNumber(target);
        }, 500);
        let next = target;
        while (next = next.nextElementSibling) {
            if (next.tagName.toLowerCase() === "input") {
                showPinNumber(next);
                next.focus();
                break;
            }
        }

        if (next === null) {
            target.blur();
        }
    }
}

function moveInputBackwards(target) {
    let prev = target;
    while (prev = prev.previousElementSibling) {
        if (target.nextElementSibling === null && target.value !== "") {
            hidePinNumber(target);
            break;
        }
        if (prev.tagName.toLowerCase() === "input") {
            showPinNumber(prev);
            prev.focus();
            break;
        }
    }
}

function onKeyDownAction(e) {
    let target = e.target;
    if (e.which === 8) {
        // Clean timeout as per scenario when a user presses key and backbutton fast
        clearTimeout(changeKeyboardToPassword);
        moveInputBackwards(target);
    } else {
        const prev = target.previousElementSibling;
        if (prev) hidePinNumber(prev);
    }
}

function hidePinNumber(target) {
    target.classList.add("mx-hybridapp-formgroup-input-protected");
}

function showPinNumber(target) {
    target.classList.remove("mx-hybridapp-formgroup-input-protected");
}

function touchStartHandler(e) {
    e.target.value = "";
    showPinNumber(e.target);
}

function cleanUserInput() {
    [].slice.call(userInput).forEach(function(element) {
        element.value = "";
    });
}

function clearInput(e) {
    e.target.value = "";
}

function preventDefaultAction(e) {
    e.preventDefault();
}

function addMoveInputListeners(containerNode) {
    containerNode.addEventListener("keyup", moveInputForward);
    containerNode.addEventListener("keydown", onKeyDownAction);
    containerNode.addEventListener("paste", preventDefaultAction);
    containerNode.addEventListener("touchstart", touchStartHandler);
    // Because focus events don't bubble we need to add an event listener
    // for the capturing phase.
    containerNode.addEventListener("focus", clearInput, true);
}

function removeMoveInputListeners(containerNode) {
    containerNode.removeEventListener("keyup", moveInputForward);
    containerNode.removeEventListener("keydown", onKeyDownAction);
    containerNode.removeEventListener("paste", preventDefaultAction);
    containerNode.removeEventListener("touchstart", touchStartHandler);
    containerNode.removeEventListener("focus", clearInput, true);
}
