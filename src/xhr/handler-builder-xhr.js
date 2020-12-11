import { 
    HandlerBuilder, JsonMapping
} from "miruken-callback";

import { XMLHttpRequestHandler } from "./xhr-handler";
import "../../src/handler-http";

HandlerBuilder.implement({
    withXMLHttpRequestClient() {
        return this.addTypes(from => from.types(JsonMapping, XMLHttpRequestHandler))
    }
});
