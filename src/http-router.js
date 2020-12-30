import { 
    $isNothing, handles, provides,
    singleton, Routed, routes, TypeIdHandling
} from "miruken-core";

import { HttpError } from "./http-error";
import { HttpOptions } from "./http-options";
import { UnknownPayloadError } from "./unknown-payload-error";
import "./handler-http";

@provides() @singleton()
export class HttpRouter {
    @handles(Routed)
    @routes("http", "https")
    route(routed, { rawCallback, composer }) {
        const { message } = routed,
                uri = rawCallback?.isMany === true ? "publish" : "process"

        return composer
            .$enableFilters()
            .$mapOptions({
                typeIdHandling: TypeIdHandling.Auto
            })
            .$httpPost(uri, { payload: message }, {
                baseAddress:  routed.route,
                contentType:  "application/json"
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
