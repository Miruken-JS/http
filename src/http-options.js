import { 
    $isNothing, $isFunction
} from "miruken-core";

import { 
    Handler, Options, handlesOptions
} from "miruken-callback";

@handlesOptions("httpOptions")
export class HttpOptions extends Options {
    baseUrl;
    timeout;
    pipeline;
    mapping;
}

Handler.implement({
    $httpBaseUrl(baseUrl) {
        if ($isNothing(baseUrl)) {
            throw new Error("The baseUrl is required.")
        }
        return this.$httpOptions({ baseUrl });
    },
    $httpTimeout(timeout) {
        if ($isNothing(timeout)) {
            throw new Error("The timeout is required.")
        }
        return this.$httpOptions({ timeout });
    },
    $httpPipeline(pipeline) {
        if ($isNothing(pipeline)) {
            throw new Error("The pipeline is required.")
        }
        return this.$httpOptions({ pipeline });
    },
    $httpMapping(mapping) {
        if ($isNothing(mapping)) {
            throw new Error("The mapping is required.")
        }
        return this.$httpOptions({ mapping });
    }, 
});
