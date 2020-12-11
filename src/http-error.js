import { $isNumber } from "miruken-core";

export class HttpError extends Error {
    constructor(statusCode, message, inner) {
        if (!$isNumber(statusCode)) {
            throw new TypeError("The statusCode must be a number.");
        }

        super(message || inner?.message);

        this.statusCode = statusCode;
        this.inner      = inner;

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    statusCode;
    content;
    inner;
}