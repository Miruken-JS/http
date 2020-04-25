import { Base } from "miruken-core";
import { Handler } from "miruken-callback";
import { mapTo, format, registerType } from "miruken-map";

export const ErrorFormat = Symbol();

export const ExceptionData = Base.extend(registerType, {
    $type: "Miruken.Http.ExceptionData, Miruken.Http",
    exceptionType: undefined,
    message:       undefined,
    source:        undefined
});

export const ErrorMapping = Handler.extend(format(ErrorFormat), {
    @mapTo(ExceptionData)
    mapError(mapTo) {
        const { value : { message } } = mapTo;
        return Error(message || "Unknown Error");
    }
});