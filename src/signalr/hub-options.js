import { Options, handlesOptions } from "@miruken/core";

@handlesOptions("hubOptions")
export class HubOptions extends Options {
    baseUrl;
    protocol;
    transports;
    automaticReconnect;
    serverTimeoutInMilliseconds;
    keepAliveIntervalInMilliseconds;
}
