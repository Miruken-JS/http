import { $isNothing } from "miruken-core";

import { 
    handles, provides, singleton,
    Routed, routes, response,
    TypeIdHandling
} from "miruken-callback";

import { Message } from "./message";
import { HttpOptions } from "./http-options";
import { HttpError } from "./http-error";
import { ErrorFormat } from "./error-mapping";
import { UnknownPayloadError } from "./unknown-payload-error";
import "./handler-http";

@provides() @singleton()
export class HttpRouter {
    @handles(Routed)
    @routes("http", "https")
    route(routed, { rawCallback, composer }) {
        const { message } = routed,
                uri = getResourceUri(routed, rawCallback);

        return composer
            .$enableFilters()
            .$mapOptions({
                typeIdHandling: TypeIdHandling.Auto
            })
            .$httpPost(uri, new Message(message), {
                baseUrl:      routed.route,
                contentType:  "application/json",
                responseType: Message.of(response.get(message))
            })
            .then(response => response.resource?.payload)
            .catch(error => {
                if (error instanceof HttpError && !$isNothing(error.content)) {
                    const { payload } = error.content;
                    if (!$isNothing(payload)) {
                        throw composer.$bestEffort()
                            .$mapFrom(payload, ErrorFormat)
                                || new UnknownPayloadError(payload);
                    }
                }
                throw error;
            });
    }
}

function getResourceUri(routed, rawCallback) {
    return rawCallback?.isMany === true ? "publish" : "process";
}