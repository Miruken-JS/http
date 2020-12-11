import { $classOf, assignID } from "miruken-core";
import { Request } from "miruken-callback";

export class ResourceWrapper extends Request {
    constructor(resource) {
        if (new.target === ResourceWrapper) {
            throw new TypeError("ResourceWrapper cannot be instantiated.");
        }
        super();
        this.resource = resource;
    }

    resource;
}

export class ResourceRequest extends ResourceWrapper {
    baseAddress;
    resourceUri;
    responseType;
    contenType;
    headers;
    timeout;

    getCacheKey() {
        const resource    = this.resource,
              resourceKey = resource?.getCacheKey?.();
        if (!$isNothing(resourceKey)) {
            return JSON.stringify(this, (name, value) =>
                name === "request"
                ? `${assignID($classOf(resource))}#${resourceKey}`
                : value
            );
        }
    }    
}

export class ResourceResponse extends ResourceWrapper {
    resourceUri;
    headers;
}

export class GetRequest  extends ResourceRequest {}
export class GetResponse extends ResourceResponse {}

export class PutRequest  extends ResourceRequest {}
export class PutResponse extends ResourceResponse {}

export class PostRequest  extends ResourceRequest {}
export class PostResponse extends ResourceResponse {}

export class PatchRequest  extends ResourceRequest {}
export class PatchResponse extends ResourceResponse {}

export class DeleteRequest  extends ResourceRequest {}
export class DeleteResponse extends ResourceResponse {}

export class HeadRequest  extends ResourceRequest {}
export class HeadResponse extends ResourceResponse {}