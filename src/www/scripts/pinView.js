"use strict";

var pin = require("./pin");
var secureStore = require("./secure-store");
var TokenStore = require("./Token-store");

var tokenStore = new TokenStore(secureStore);

var clickType = typeof document.ontouchstart === "undefined" ? "click" : "touchstart";
var changeKeyboardToPassword;

var pinNode = document.getElementById("mx-pin-container");
var errorNode = document.getElementById("mx-pin-error");
var confirmPinButton = document.getElementById("mx-confirm-pin");
var forgotPinButton = document.getElementById("mx-forgot-pin");
var userInput = document.querySelectorAll("#mx-pin-container input");

module.exports = (function() {
    var verify = function(callback) {
        updateErrorText(__("Verify your PIN"));

        addMoveInputListeners(pinNode);
        cleanUserInput();

        confirmPinButton.addEventListener(clickType, verifyPinAction);
        forgotPinButton.addEventListener(clickType, forgetPinAction);

        forgotPinButton.style.display = "";
        pinNode.style.display = "flex";

        function verifyPinAction() {
            pin.verify(getEnteredPin()).then(closeView, function() {
                pin.getAttemptsLeft().then(function(attemptsLeft) {
                    if (attemptsLeft === 0) {
                        forgetPinAction().then(closeView);
                    } else {
                        updateErrorText(__("Invalid PIN"));
                        cleanUserInput();
                    }
                });
            });
        }

        function forgetPinAction() {
            Promise.all([
                tokenStore.remove(),
                pin.remove()
            ]).then(closeView);
        }

        function closeView() {
            removeMoveInputListeners(pinNode);
            confirmPinButton.removeEventListener(clickType, verifyPinAction);
            forgotPinButton.removeEventListener(clickType, forgetPinAction);

            pinNode.style.display = "";

            if (callback) callback();
        }
    };

    var configure = function(message, callback) {
        updateErrorText(message);
        addMoveInputListeners(pinNode);

        cleanUserInput();

        forgotPinButton.style.display = "none";
        pinNode.style.display = "flex";

        confirmPinButton.addEventListener(clickType, validatePin);

        function validatePin() {
            var userPin = getEnteredPin();

            if (pin.isValid(userPin)) {
                confirmPinButton.removeEventListener(clickType, validatePin);
                removeMoveInputListeners(pinNode);

                pinNode.style.display = "";

                if (callback) callback(userPin);
            } else {
                errorNode.textContent = __("The PIN you have submitted is invalid");
            }
        }
    };

    var confirm = function(pinToConfirm, callback, error) {
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
            var userPin = getEnteredPin();

            if (userPin === pinToConfirm) {
                pin.set(userPin).then(function() {
                    removeSelf();

                    if (callback) callback();
                });
            } else {
                removeSelf();

                if (error) error(new Error(__("PIN did not match")));
            }
        }
    };

    var getEnteredPin = function() {
        var enteredPin = [].slice.call(userInput).map(function (element) {
            return element.value;
        }).join("");
        return enteredPin;
    };

    var updateErrorText = function(message) {
        pin.getAttemptsLeft().then(function(attemptsLeft) {
            errorNode.textContent = message;
            if (attemptsLeft === 1) {
                errorNode.textContent += ". " + __("You have one more attempt");
            }
        });
    };

    var moveInputForward = function(e) {
        var target = e.target;

        if (!/^[0-9]{1}/.test(target.value)) {
            target.value = "";
        }

        if (target.value.length >= 1) {
            target.value = target.value[0];
            // We would like to have visual feedback of the typed number
            // rather than changing to star immediately
            changeKeyboardToPassword = setTimeout(function() {
                switchKeyboard(target, "password");
            }, 500);
            var next = target;
            while (next = next.nextElementSibling) {
                if (next.tagName.toLowerCase() === "input") {
                    switchKeyboard(next, "number");
                    next.focus();
                    break;
                }
            }

            if (next == null) {
                target.blur();
            }
        }
    };

    var moveInputBackwards = function(target) {
        var prev = target;
        while (prev = prev.previousElementSibling) {
            if (target.nextElementSibling == null && target.value !== "") {
                switchKeyboard(target, "password");
                break;
            }
            if (prev.tagName.toLowerCase() === "input") {
                switchKeyboard(prev, "number");
                prev.focus();
                break;
            }
        }
    };

    var onKeyDownAction = function(e) {
        var target = e.target;
        if (e.which === 8) {
            // Clean timeout as per scenario when a user presses key and backbutton fast
            clearTimeout(changeKeyboardToPassword);
            moveInputBackwards(target);
        } else {
            var prev = target.previousElementSibling;
            if (prev) switchKeyboard(prev, "password");
        }
    };

    var switchKeyboard = function(target, type) {
        // As we want to have the best of both worlds: password protected input and
        // numeric keyboard; we dynamically switch the type of input field. This
        // hack allows us to have instant protection of the fields, while the
        // text-security works with a noticeable delay
        target.setAttribute("type", type);
    };

    var switchToNumericKeyboard = function(e) {
        e.target.value = "";
        switchKeyboard(e.target, "number");
    };

    var cleanUserInput = function() {
        [].slice.call(userInput).forEach(function(element) {
            element.value = "";
        });
    };

    var clearInput = function(e) {
        e.target.value = "";
    };

    var preventDefaultAction = function(e) {
        e.preventDefault();
    };

    var addMoveInputListeners = function(containerNode) {
        containerNode.addEventListener("keyup", moveInputForward);
        containerNode.addEventListener("keydown", onKeyDownAction);
        containerNode.addEventListener("paste", preventDefaultAction);
        containerNode.addEventListener("touchstart", switchToNumericKeyboard);
        // Because focus events don't bubble we need to add an event listener
        // for the capturing phase.
        containerNode.addEventListener("focus", clearInput, true);
    };

    var removeMoveInputListeners = function(containerNode) {
        containerNode.removeEventListener("keyup", moveInputForward);
        containerNode.removeEventListener("keydown", onKeyDownAction);
        containerNode.removeEventListener("paste", preventDefaultAction);
        containerNode.removeEventListener("touchstart", switchToNumericKeyboard);
        containerNode.removeEventListener("focus", clearInput, true);
    };

    return {
        verify: verify,
        configure: configure,
        confirm: confirm
    }
})();