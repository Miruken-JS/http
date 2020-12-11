import {
    Handler, mapsTo, format, typeId
} from "miruken-callback";

export const ErrorFormat = Symbol();

@typeId("Miruken.Http.ExceptionData, Miruken.Http")
export class ExceptionData {
    exceptionType;
    message;
    source;
};

@format(ErrorFormat)
export class ErrorMapping extends Handler {
    @mapsTo(ExceptionData)
    mapError(mapsTo) {
        const { value : { message } } = mapTo;
        return Error(message || "Unknown Error");
    }
}
