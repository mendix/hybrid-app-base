"use strict";

import * as Namespace from "./namespace";

const TOKENKEY = "mx-authtoken";

export default class TokenStore {
    constructor(storeClass) {
        this._storeClass = storeClass;
    }

    async set(tokenValue) {
        const storageNamespace = await Namespace.get();

        await this._storeClass.set(storageNamespace, TOKENKEY, tokenValue);
    };

    async get() {
        const storageNamespace = await Namespace.get();

        try {
            return await this._storeClass.get(storageNamespace, TOKENKEY);
        } catch(e) {
            return undefined;
        }
    };

    async remove() {
        const storageNamespace = await Namespace.get();

        try {
            await this._storeClass.remove(storageNamespace, TOKENKEY);
        } catch(e) {
            return;
        }
    };
};
