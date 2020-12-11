import { $isNothing } from "miruken-core";

import { 
    handles, provides, singleton,
    Routed, routes
} from "miruken-callback";

import { HttpOptions } from "./http-options";

@routes("http", "https")
@provides() @singleton()
export class HttpRouter {
    @handles(Routed)
    route(routed, { rawCallback, composer }) {
    }
}

function getResourceUri(routed, rawCallback, composer) {
    return rawCallback?.isMany === true ? "Publish" : "Process";
}