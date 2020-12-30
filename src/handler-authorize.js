import { Handler, $isFunction, $isPromise } from "miruken-core";

Handler.implement({
    $httpBasic(username, password) {
        return this.$httpPipeline([(request, composer, next) => {
            if ($isFunction(username)) {
                const credential = username();
                if ($isPromise(credential)) {
                    return credential.then(result => {
                        basic(result?.username, result?.password, request);
                        return next();
                    });
                }
                username = credential?.username;
                password = credential?.password;
            }
            basic(username, password, request);
            return next();
        }]);
    },
    $httpToken(token, scheme) {
        return this.$httpPipeline([(request, composer, next) => {
            if ($isFunction(token)) {
                const credential = token();
                if ($isPromise(credential)) {
                    return credential.then(result => {
                        token(result?.token, result?.scheme, request);
                        return next();
                    });
                }
                token  = credential?.token;
                scheme = credential?.scheme;
            }
            token(token, scheme, request);
            return next();
        }]);
    },  
});

function basic(username, password, request) {
    const { headers = {} } = request;
    username = username || "";
    password = password ? unescape(encodeURIComponent(password)) : "";
    headers["Authorization"] = "Basic " + btoa(username + ":" + password);
    request.headers = headers;
}

function token(token, scheme) {
    const { headers = {} } = request;
    headers["Authorization"] = `${scheme || "Bearer"} ${token || ""}`;
    request.headers = headers;
}