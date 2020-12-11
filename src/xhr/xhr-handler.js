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
            { resource, responseType, contentType, headers } = request;

        xhr.open(verb, url.href);
        setResponseType(xhr, responseType);

        xhr.timeout = request.timeout;
        if ($isNothing(xhr.timeout)) {
            xhr.timeout = options?.timeout;
        }

        const promise = new Promise((resolve, reject) => {
            xhr.onload = () => {
                const { status, statusText } = xhr,
                        contentType = xhr.getResponseHeader("Content-Type"),
                        content     = getResponse(xhr, contentType);
                if (status >= 200 && status < 300) {
                    if (!($isNothing(content) || $isNothing(contentType) ||
                          $isNothing(responseType) || xhr.responseType !== "")) {
                        response.resource = composer.mapTo(
                            content, contentType, responseType, 
                                x => x.strategy = options.mapping);
                    } else {
                        response.resource = content;
                    }
                    response.headers     = createResponseHeadersMap(xhr);
                    response.resourceUri = xhr.responseURL;
                    resolve(response);
                } else {
                    const error = new HttpError(status, statusText);
                    if (!($isNothing(content) || $isNothing(contentType))) {
                        error.content = composer.$bestEffort().mapFrom(
                            content, contentType, x => x.strategy = options.mapping);
                    }
                    reject(error);
                }
            };

            xhr.onerror = () => {
                reject(new HttpError(request, "A network-level error occurred during an XMLHttpRequest."));
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
                const content = composer.mapFrom(resource, contentType,
                    x => x.strategy = options.mapping);
                body = getBody(content, true);
            }
            if ($isNothing(body)) {
                return Promise.reject(request, new HttpError("Unsupported http content."));
            }
        }

        if (!$isNothing(headers)) {
            for (const [header, value] of headers) {
                xhr.setRequestHeader(header, value);
            }
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

function createResponseHeadersMap(xhr) {
    const headers = xhr.getAllResponseHeaders();
    if ($isNothing(headers)) return;

    const headerMap = new Map(),
          lines     = headers.trim().split(/[\r\n]+/);

    lines.forEach(line => {
        const parts  = line.split(': '),
              header = parts.shift(),
              value  = parts.join(': ');
        headerMap.set(header, value);
    });

    return headerMap;
}
