import { $isNothing, $isObject } from "@miruken/core";
import { TypeHelper } from "./type-helper";

const DEFAULT_CONTENT_TYPE = "application/x-www-form-urlencoded";

export function normalizeHttpRequest(request, composer, next) {
    const { headers = {}, resource } = request;
    
    if ($isNothing(headers["Accept"])) {
        headers["Accept"] = "application/json, text/plain, */*";
    }
    if ($isNothing(resource)) {
        delete headers["Content-Type"];
    } else if ($isNothing(resource.contentType)) {
        request.contentType = headers["Content-Type"];
    }

    if (!$isNothing(resource) && $isNothing(resource.contentType)) {
        request.contentType = inferContentType(resource);
    }
    
    request.headers = headers;
    
    return next();
}

function inferContentType(resource) {
    if (TypeHelper.isFormData(resource) ||
        TypeHelper.isArrayBuffer(resource) ||
        TypeHelper.isBlob(resource)) {
        return DEFAULT_CONTENT_TYPE;
    }
    if (TypeHelper.isURLSearchParams(resource)) {
        return "application/x-www-form-urlencoded;charset=utf-8";
    }
    if ($isObject(resource)) {
        return "application/json;charset=utf-8";
    }
    return DEFAULT_CONTENT_TYPE;
}
