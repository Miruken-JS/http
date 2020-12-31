import { createKey } from "@miruken/core";

const _ = createKey();

export class UnknownPayloadError extends Error {
    constructor(payload) {
        super(`Unable to map the error payload '${payload?.constructor?.name}'.`);

        _(this).payload = payload;

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    get payload() { return _(this).payload; }
}
