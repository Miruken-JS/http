import { 
    Handler, $isFunction, $isNothing,
    $isString, $isPlainObject
} from "miruken-core";

import { 
    GetRequest, PutRequest, PostRequest,
    PatchRequest, DeleteRequest 
} from "./http-requests";

import "./http-options";

Handler.implement({
    $httpGet(uri, configure) {
        const get = new GetRequest();
        configureRequest(uri, get, null, configure);
        return this.send(get);
    },
    $httpPut(uri, resource, configure) {
        const put = new PutRequest();
        configureRequest(uri, put, resource, configure);
        return this.send(put);
    },
    $httpPost(uri, resource, configure) {
        const post = new PostRequest();
        configureRequest(uri, post, resource, configure);
        return this.send(post);
    },
    $httpPatch(uri, resource, configure) {
        const patch = new PatchRequest();
        configureRequest(uri, patch, resource, configure);
        return this.send(patch);
    },
    $httpDelete(uri, configure) {
        const remove = new DeleteRequest();
        configureRequest(uri, remove, resource, configure);
        return this.send(remove);
    }         
});

function configureRequest(uri, request, resource, configure) {
    request.resourceUri = uri;
    request.resource    = resource;
    if ($isFunction(configure)) {
        configure(request);
    } else {
        Object.assign(request, configure);
    }
}