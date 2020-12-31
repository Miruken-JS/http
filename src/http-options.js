import { Options, handlesOptions } from "@miruken/core";

@handlesOptions("httpOptions")
export class HttpOptions extends Options {
    baseUrl;
    timeout;
    headers;
    pipeline;
    withCredentials;
}
