import { 
    $isNothing, $isObject, $isPlainObject
} from "miruken-core";

import { 
    provides, singleton, TimeoutError, RejectedError
} from "miruken-callback";

import { HttpHandler } from "../http-handler";
import { HttpError } from "../http-error";
import { TypeHelper } from "../type-helper";

@provides() @singleton()
export class XMLHttpRequestHandler extends HttpHandler {
    sendRequest(verb, url, request, response, options, composer) {
        const xhr = new XMLHttpRequest(),
            { resource, responseType, contentType, headers } = request,
            { timeout, withCredentials } = options || {};

        xhr.timeout         = timeout;
        xhr.withCredentials = withCredentials;
        xhr.open(verb, url.href);
        
        setResponseType(xhr, responseType);

        const promise = new Promise((resolve, reject) => {
            xhr.onload = () => {
                const { status, statusText } = xhr,
                        contentType = xhr.getResponseHeader("Content-Type"),
                        content     = getResponse(xhr, contentType);
                if (status >= 200 && status < 300) {
                    if (!($isNothing(content) || $isNothing(contentType) ||
                          xhr.responseType !== "")) {
                        response.resource = composer.$mapTo(
                            content, contentType, responseType);
                    } else {
                        response.resource = content;
                    }
                    response.headers     = createResponseHeaders(xhr);
                    response.resourceUri = xhr.responseURL;
                    resolve(response);
                } else {
                    const error = new HttpError(status, statusText);
                    if (!($isNothing(content) || $isNothing(contentType))) {
                        error.content = composer.$bestEffort()
                            .$mapTo(content, contentType) || content;
                    }
                    reject(error);
                }
            };

            xhr.onerror = () => {
                reject(new Error("A network-level error occurred during an XMLHttpRequest."));
            }

            xhr.ontimeout = () => {
                reject(new TimeoutError(request, "A timeout occurred during an XMLHttpRequest."));
            }

            xhr.onabort = () => {
                reject(new RejectedError(request, "The XMLHttpRequest has been aborted."));
            }
        });

        let body;
        if (!$isNothing(resource)) {
            body = getBody(resource, false);
            if ($isNothing(body) && $isObject(resource)) {
                const content = composer.$mapFrom(resource, contentType);
                body = getBody(content, true);
            }
            if ($isNothing(body)) {
                return Promise.reject(request, new Error("Unsupported http content."));
            }
        }

        if (!$isNothing(headers)) {
            Reflect.ownKeys(headers).forEach(header =>
                xhr.setRequestHeader(header, headers[header])
            );
        }

        xhr.send(body);
        return promise;
    }
}

function getBody(resource, json) {
    if (resource instanceof Document ||
        TypeHelper.isFormData(resource) ||
        TypeHelper.isArrayBuffer(resource) ||
        TypeHelper.isBlob(resource)) {
            return resource;
    }
    if (TypeHelper.isURLSearchParams(resource)) {
        return resource.toString()
    } 
    if (json && $isPlainObject(resource)) {
        return JSON.stringify(resource);
    }
}

function setResponseType(xhr, responseType) {
    if (TypeHelper.hasArrayBuffer && responseType === ArrayBuffer) {
        xhr.responseType = "arraybuffer";
    } else if (TypeHelper.hasBlob && responseType === Blob) {
        xhr.responseType = "blob";
    } else if (responseType === Document || responseType === XMLDocument) {
        xhr.responseType = "document";
    }
}

function getResponse(xhr, contentType) {
    switch (xhr.responseType) {
        case "arraybuffer":
        case "blob":
            return xhr.response;
    }
    let response = xhr.responseXML;
    if (!$isNothing(response)) return response;
    response = xhr.response;
    if (!$isNothing(response)) {
        return JSON.parse(response);
    }
}

function createResponseHeaders(xhr) {
    const headers = xhr.getAllResponseHeaders();
    if ($isNothing(headers)) return;

    const headerMap = {},
          lines     = headers.trim().split(/[\r\n]+/);

    lines.forEach(line => {
        const parts  = line.split(': '),
              header = parts.shift(),
              value  = parts.join(': ');
        headerMap[header] = value;
    });

    return headerMap;
}
