import {
    Handler, provides, singleton,
    mapsTo, mapsFrom, format, typeId
} from "miruken-callback";

export const ErrorFormat = Symbol();

@typeId("Miruken.Http.ExceptionData, Miruken.Http")
export class ErrorData {
    exceptionType;
    message;
    source;
};

@format(ErrorFormat)
@provides() @singleton()
export class ErrorMapping extends Handler {
    @mapsFrom(ErrorData)
    mapToError({ object }) {
        return Error(object?.message || "Unknown Error");
    }

    @mapsFrom(Error)
    mapToErrorData({ object }) {
        return Object.assign(new ErrorData(), {
            message: object?.message || "Unknown Error",
            source:  object?.name
        });
    }
}
