﻿import {
    Handler, provides, singleton, mapsTo,
    mapsFrom, format, surrogate, typeId
} from "miruken-callback";

@surrogate(Error)
@typeId("Miruken.Http.ExceptionData, Miruken.Http")
export class ErrorData {
    constructor(message) {
        this.message = message;
    }

    exceptionType;
    message;
    source;
};

@provides() @singleton()
export class ErrorMapping extends Handler {
    @format(Error)
    @mapsFrom(ErrorData)
    mapToError({ object }) {
        const message = object?.message || "Unknown Error",
              error   = new Error(message);
        error.name = object?.name;
        return error;
    }

    @format(ErrorData)
    @mapsFrom(Error)
    mapToErrorData({ object }) {
        const message = object?.message || "Unknown Error",
              errorData = new ErrorData(message);
        errorData.name = object?.name;
        return errorData;
    }
}
