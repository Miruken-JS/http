import { $isNothing } from "miruken-core";

import { 
    handles, provides, singleton,
    Routed, routes, response,
    TypeIdHandling
} from "miruken-callback";

import { Message } from "./message";
import { HttpOptions } from "./http-options";
import { HttpError } from "./http-error";
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
                baseAddress:  routed.route,
                contentType:  "application/json",
                responseType: Message.of(response.get(message))
            })
            .then(response => response.resource?.payload)
            .catch(error => {
                if (error instanceof HttpError) {
                    const { payload } = error.content;
                    if (!$isNothing(payload)) {
                        if (payload instanceof Error) throw payload;
                        throw new UnknownPayloadError(payload);
                    }
                }
                throw error;
            });
    }
}

function getResourceUri(routed, rawCallback) {
    return rawCallback?.isMany === true ? "publish" : "process";
}