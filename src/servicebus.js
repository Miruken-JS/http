﻿import {
    StrictProtocol, Base, Resolving, Policy, design, 
} from "miruken-core";

import {
    Handler, Batching, handles, $composer
} from "miruken-callback";

import {
    Mapper, JsonFormat, ignore, TypeFormat, registerType, 
} from "miruken-map";

import { ErrorFormat } from "./errorMapping";
import { idEntry } from "./mappings";

//import { post } from "axios";
const axios = require('axios').default;

export const dynamic = Object.freeze({ dynamic: true });

export const Result = Base.extend(registerType);

export const Data = Base.extend({
}, {
    coerce(initial) {
        return Reflect.construct(this, arguments);
    }
});

export const Key = Data.extend({
    id:      undefined,
    orderBy: undefined,
    name:    undefined
});
Key.prototype.valueOf = function () { return this.id; };

export const KeysResult = Result.extend({
    $type: "SixFlags.MediatR.KeysResult`1[[System.Int32, mscorlib]], SixFlags.MediatR",
    @design(Key)
    keys:  undefined
});

export const Request = Base.extend({
    $type: undefined,   // Ensures $type comes first (Needed by JSON.NET)
    constructor(data) {
        this.base(data, dynamic);
    },

    getPath() {
        let path = "process",
            type = this.$type;
        if (type) {
            const index = type.lastIndexOf(",");
            type = type.substring(0, index)
                .replace(/[.]?\b[A-Z]/g, function (f) {
                    return f.replace(".", "/").toLowerCase();
                });
            path = `${path}/${type}`;
        }
        return path;
    },
    mapResponse(response, composer) {
        const responseType = this.responseType;
        if (responseType) {
            return Mapper(composer).mapTo(response, JsonFormat, responseType, dynamic);
        }
        return response;
    },
    mapIds(items, mapper) {
        return new Map(items.map(idEntry(mapper)));
    }
}, {
    coerce(response) {
        if (this === Request) {
            const request = Request.extend();
            if (response) {
                request.implement({
                    @ignore
                    get responseType() {
                        return response;
                    }
                });
            }
            return request;
        }
        return Reflect.construct(this, arguments);
    }
});

export const InputValidationResult = Result.extend({
    isValid: undefined
});

export const AnonymousRequest = Request.extend();

export const Cached = Request.extend({
    $type:      "SixFlags.MediatR.Cache.Cached`1[[%1]], SixFlags.MediatR",
    request:    undefined,
    timeToLive: "1:00:00",

    constructor(request, timeToLive) {
        const responseType = request.responseType;
        if (!responseType || !responseType.prototype.$type) {
            throw new TypeError("Cached requests must provide a responseType.$type");
        }
        this.request    = request;
        this.$type      = format(this.$type, responseType.prototype.$type);
        this.timeToLive = timeToLive || this.timeToLive;
    },

    getPath() {
        return `${this.request.getPath()}/cached`;
    },
    mapResponse(response) {
        return this.request.mapResponse(response);
    }
});

Request.implement({
    cached(timeToLive) {
        return new Cached(this, timeToLive || "1:00:00");
    }
});

export const Scheduled = Request.extend({
    $type: "Miruken.Mediate.Scheduled.Parallel,Miruken.Mediate",
    requests: undefined,
    constructor(requests) {
        this.requests = requests || [];
    },

    mapResponse(response) {
        if (response && response.responses) {
            const responses = [];
            for (let index = 0; index < response.responses.length; ++index) {
                const resp = response.responses[index];
                responses.push(this.requests[index].mapResponse(resp));
            }
            return responses;
        }
        return this.base(response);
    }
});

export const Concurrent = Scheduled.extend({
    $type: "Miruken.Mediate.Schedule.Concurrent,Miruken.Mediate"
});

export const Parallel = Scheduled.extend({
    $type: "Miruken.Mediate.Schedule.Parallel,Miruken.Mediate"
});

export const Sequential = Scheduled.extend({
    $type: "Miruken.Mediate.Schedule.Sequential,Miruken.Mediate"
});

const ConcurrentLegacy = Scheduled.extend({
    $type: "SixFlags.MediatR.Concurrency.Concurrent,SixFlags.MediatR"
});

export const Try = Request.extend({
    constructor(request) {
        const promise = new Promise((resolve, reject) => {
            this.extend({
                mapResponse(response) {
                    if (Reflect.has(response, "isLeft")) {
                        const isLeft = response.isLeft;
                        response = response.value;
                        if (isLeft) {
                            reject(response);
                            return response;
                        }
                    }
                    response = request.mapResponse(response);
                    resolve(response);
                    return response;
                }
            });
        });
        this.extend({
            get request() { return request; },
            get promise() { return promise; },
            toData() { return request.toData(); }
        });
    }
});

export const RoutePolicy = Policy.extend({
    baseUrl:   undefined,
    timeout:   undefined,
    scheduler: undefined
});

Handler.implement({
    route(policy) {
        if (policy == null) return this;
        if (!(policy instanceof RoutePolicy)) {
            policy = new RoutePolicy(policy);
        }
        return this.decorate({
            @handles(RoutePolicy)
            route(route) {
                return policy.mergeInto(route);
            }
        });
    },
    schedule(scheduler) {
        return this.route(RoutePolicy({
            scheduler: scheduler
        }));
    },
    concurrent() {
        return this.schedule(Concurrent);
    },
    sequential() {
        return this.schedule(Sequential);
    },
    parallel() {
        return this.schedule(Parallel);
    }
});

export const ServiceBus = StrictProtocol.extend(Resolving, {
    process(request) { }
});

export const ServiceBusHandler = Handler.extend(ServiceBus, {
    constructor() {
        this.extend({
            process(request) {
                if (!(request instanceof Request)) {
                    request = new AnonymousRequest(request);
                }
                const batcher = $composer.getBatcher(ServiceBus);
                if (batcher) {
                    const batch = this.createBatch(batcher);
                    batcher.addHandlers(batch);
                    return batch.process(request);
                }
                const route    = new RoutePolicy(),
                      hasRoute = $composer.handle(route, true),
                      baseUrl  = route.baseUrl
                               ? (route.baseUrl.endsWith("/")
                                    ? route.baseUrl
                                    : route.baseUrl + "/")
                               : "",
                      path     = request.getPath(),
                      config   = route.hasOwnProperty("timeout")
                               ? { timeout: route.timeout }
                               : null;
                const composer = $composer,
                      json     = Mapper(composer).mapFrom(request, JsonFormat);

                return post(`${baseUrl}${path}`, { payload: json }, config)
                    .then(response => {
                        const data = response.data;
                        return data && request.mapResponse(data.payload, composer);
                    }).catch(err => {
                        const {
                            response: {
                                data: {
                                    payload
                                } = { }
                            } = { }
                        } = err; 

                        if (payload && payload.$type) {
                            const mapper  = Mapper(composer),
                                  type    = mapper.mapTo(payload.$type, TypeFormat),
                                  details = type && mapper.mapTo(payload, JsonFormat, type, dynamic),
                                  error   = details && mapper.mapTo(details, ErrorFormat);
                          
                            if (error) throw error;
                        }

                        throw err;
                    });
            }
        });
    }
});

export const ServiceBusBatch = Base.extend(ServiceBus, Batching, {
    constructor() {
        const _groups = new Map();
        this.extend({
            process(request) {
                const route  = new RoutePolicy(),
                    hasRoute = $composer.handle(route, true),
                    baseUrl  = route.baseUrl;
                let group = _groups.get(baseUrl);
                if (!group) {
                    _groups.set(baseUrl, group = {
                        requests: [],
                        responses: [],
                        promises: []
                    });
                }
                group.requests.push(request);
                let rejectPromise = Undefined;
                const promise = new Promise((resolve, reject) => {
                    group.responses.push(resolve);
                    rejectPromise = reject;
                });
                extend(promise, "reject", rejectPromise);
                group.promises.push(promise);
                return promise;
            },
            complete(composer) {
                const bus = ServiceBus(composer);
                return Promise.all([..._groups].map(([url, group]) =>
                    group.requests.length === 1
                        ? bus.process(group.requests[0]).then(resp => {
                            group.responses[0](resp);
                            return [url, [resp]];
                        })
                        : bus.process(ConcurrentLegacy(group.requests)).then(resp => {
                            for (let i = 0; i < resp.length; ++i) {
                                group.responses[i](resp[i]);
                            }
                            return Promise.all(group.promises).then(() => [url, resp]);
                        })
                ));
            }
        });
    }
});

export const HttpRouteBatch = Base.extend(ServiceBus, Batching, {
    constructor() {
        const _groups = new Map();
        this.extend({
            process(request) {
                const route  = new RoutePolicy(),
                    hasRoute = $composer.handle(route, true),
                    baseUrl  = route.baseUrl;
                let group = _groups.get(baseUrl);
                if (!group) {
                    _groups.set(baseUrl, group = new Map());
                }
                const scheduler = route.scheduler || Parallel;
                let scheduled   = group.get(scheduler);
                if (!scheduled) {
                    group.set(scheduler, scheduled = new scheduler());
                }
                const scheduledRequest = Try(request);
                scheduled.requests.push(scheduledRequest);
                return scheduledRequest.promise;
            },
            complete(composer) {
                const bus = ServiceBus(composer),
                    schedules = [..._groups].map(([url, group]) =>
                        this.schedule(url, group, bus));
                return schedules.length === 1 ? schedules[0]
                    : Promise.all(schedules);
            },
            schedule(url, group, bus) {
                const schedules = [...group.values()],
                    scheduled = schedules.map(_normalize),
                    request = scheduled.length > 1
                        ? new Concurrent(scheduled)
                        : scheduled[0];
                return bus.process(request)
                    .then(responses => [url, responses]);
            }
        });
    }
});

function _normalize(request) {
    return request instanceof Scheduled &&
        request.requests.length > 1
        ? Try(request) : request.requests[0];
}

ServiceBusHandler.implement({
    createBatch(batcher) {
        return new HttpRouteBatch();
    }
});

