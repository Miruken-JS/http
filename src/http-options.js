import { 
    Options, handlesOptions
} from "miruken-callback";

@handlesOptions("httpOptions")
export class HttpOptions extends Options {
    baseUrl;
    timeout;
    pipeline;
    withCredentials;
}
