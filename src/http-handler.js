import { 
    $isNothing, $isFunction, $classOf
} from "miruken-core";

import { 
    Handler, handles, options
} from "miruken-callback";

import {
    GetRequest,    GetResponse,
    PutRequest,    PutResponse,
    PostRequest,   PostResponse,
    PatchRequest,  PatchResponse,
    DeleteRequest, DeleteResponse,
    HeadRequest,   HeadResponse
} from "./http-requests";

import { HttpOptions } from "./http-options";
import { normalizeHttpRequest } from "./normalize-http-request";

const DEFAULT_PIPELINE = [ normalizeHttpRequest ];

export class HttpHandler extends Handler {
    constructor() {
        if (new.target === HttpHandler) {
            throw new Error("HttpHandler cannot be instantiated.");
        }
        super();
    }

    @handles(GetRequest)
    get(get, @options(HttpOptions) options, { composer }) {
        return send(this, "GET", get, new GetResponse(), options, composer);
    }

    @handles(PutRequest)
    put(put, @options(HttpOptions) options, { composer }) {
        return send(this, "PUT", put, new PutResponse(), options, composer);
    }

    @handles(PostRequest)
    post(post, @options(HttpOptions) options, { composer }) {
        return send(this, "POST", post, new PostResponse(), options, composer);
    }

    @handles(PatchRequest)
    patch(patch, @options(HttpOptions) options, { composer }) {
        return send(this, "PATCH", patch, new PatchResponse(), options, composer);
    }

    @handles(DeleteRequest)
    delete(remove, @options(HttpOptions) options, { composer }) {
        return send(this, "DELETE", remove, new DeleteResponse(), options, composer);
    }

    @handles(HeadRequest)
    delete(head, @options(HttpOptions) options, { composer }) {
        return send(this, "HEAD", head, new HeadResponse(), options, composer);
    }

    sendRequest(verb, url, request, payload, response, options, composer) {
        throw new Error(`${$classOf(this).name} must override sendRequest().`);
    }

    createUrl(request, options, composer) {
        const { baseAddress, resourceUri } = request;
        return resourceUri instanceof URL ? resourceUri
            : new URL(resourceUri,  baseAddress || options?.baseUrl)
    }
}

function send(o, verb, request, response, options, composer) {
    const pipeline = options?.pipeline?.concat(DEFAULT_PIPELINE) 
                  || DEFAULT_PIPELINE;
    try {
        return pipeline.reduceRight((next, pipe) =>
            c => pipe(request, c, cc => next(cc || c)), c => {
                const url = o.createUrl(request, options, c);
                return o.sendRequest(verb, url, request, response, options, c);
            })(composer);
    } catch (error) {
        return Promise.reject(error);
    }
}