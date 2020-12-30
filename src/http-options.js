import { Options, handlesOptions } from "miruken-core";

@handlesOptions("httpOptions")
export class HttpOptions extends Options {
    baseUrl;
    timeout;
    pipeline;
    withCredentials;
}
