import { 
    Try, $isNothing, handles, provides,
    singleton, Routed, routes, options,
    TypeIdHandling, JsonFormat, createKey
} from "@miruken/core";

import { HttpOptions } from "../http-options";
import { HubOptions } from "./hub-options";

import { 
    HubConnectionInfo, HubConnect, HubDisconnect,
    HubReconnecting, HubReconnected, HubClosed
} from "./hub-requests";

import { UnknownPayloadError } from "../unknown-payload-error";
import "./handler-hub";

import * as signalR from "@microsoft/signalr";

const _ = createKey();

@provides() @singleton()
export class HubRouter {
    constructor() {
        _(this).connections = new Map();
    }

    @routes("hub")
    @handles(Routed)
    async route(routed,
        @options(HubOptions)  hubOptions,
        @options(HttpOptions) httpOptions,
        { rawCallback, composer }) {

        const hub = routed.route.substring(4),
              url = getHubEndpoint(hub, hubOptions, httpOptions);

        const mapper = composer.$enableFilters().$mapOptions({
            typeIdHandling: TypeIdHandling.Auto
        });

        const { message } = routed,
                content   = mapper.$mapFrom({ payload: message }, JsonFormat);

        const connection = await getConnection.call(
            this, url, hubOptions, httpOptions, composer);

        if (rawCallback?.isMany) {
            await connection.send("Publish", content);
        } else {
            const result   = await connection.invoke("Process", content),
                  response = mapper.$mapTo(result, JsonFormat, Try);
            return response?.fold(failure => {
                const { payload } = failure;
                if (payload instanceof Error) {
                    throw payload;
                }
                throw new UnknownPayloadError(payload);
            }, success => success.payload);
        }
    }

    @handles(HubConnect)
    async connect(connect,
        @options(HubOptions)  hubOptions,
        @options(HttpOptions) httpOptions,
        { composer }) {
        const url = getHubEndpoint(connect.url, hubOptions, httpOptions);
        const connection = await getConnection.call(
            this, url, hubOptions, httpOptions, composer, connect);
        return getConnectionInfo(connection, url);
    }

    @handles(HubDisconnect)
    async disconnect(disconnect,
        @options(HubOptions)  hubOptions,
        @options(HttpOptions) httpOptions) {
        const url = getHubEndpoint(disconnect.url, hubOptions, httpOptions);
        await disconnectHub.call(this, url);
    }
}

function getHubEndpoint(url, hubOptions, httpOptions) {
    const baseUrl = hubOptions?.baseUrl || httpOptions?.baseUrl;
    try {
        return new URL(url, baseUrl).href;
    } catch {
        return url;  // relative url ???
    }
}

function getConnectionInfo(connection, url) {
    return new HubConnectionInfo(connection.connectionId, url);
}

async function getConnection(url, hubOptions, httpOptions, composer, connect) {
    const connections = _(this).connections;
    let   connection  = connections.get(url);

    if (!$isNothing(connection) &&
         connection.state != signalR.HubConnectionState.Disconnected) {
        if (!$isNothing(connect)) {
            throw new Error(`A connection to the Hub @ ${url} already exists.`);
        }
        return connection;
    }

    await disconnectHub.call(this, url);
    
    const { protocol, transports, automaticReconnect,
            serverTimeoutInMilliseconds, keepAliveIntervalInMilliseconds } =
               hubOptions || {};

    let builder = new signalR.HubConnectionBuilder();

    builder = $isNothing(transports) ? builder.withUrl(url)
            : builder.withUrl(url, transports);
          
    if (!$isNothing(protocol)) {
        builder = builder.withHubProtocol(protocol);
    }
    if (!$isNothing(automaticReconnect)) {
        if (automaticReconnect === true) {
            builder = builder.withAutomaticReconnect();
        } else if (automaticReconnect !== false) {
            builder = builder.withAutomaticReconnect(automaticReconnect);
        }
    }
    if (!$isNothing(httpOptions)) {
        builder.httpConnectionOptions = { 
            withCredentials: httpOptions?.withCredentials
        };
    }

    connection = builder.build();

    if (!$isNothing(serverTimeoutInMilliseconds)) {
        connection.serverTimeoutInMilliseconds = serverTimeoutInMilliseconds;
    }
    if (!$isNothing(keepAliveIntervalInMilliseconds)) {
        connection.keepAliveIntervalInMilliseconds = keepAliveIntervalInMilliseconds;
    }

    const connectionInfo = getConnectionInfo(connection, url),
          mapper = composer.$mapOptions({ typeIdHandling: TypeIdHandling.Auto }),
          notify = composer.$notify();

    connection.onclose(async error => {
        notify.$send(new HubClosed(connectionInfo, error));
        if ($isNothing(error)) {
            await disconnectHub.call(this, url);
        } else {
            await connectWithInitialRetry.call(this, connection, url);
        }
    });

    connection.on("Process", message => {
        const { payload } = mapper.$mapTo(message, JsonFormat);
        composer.$with(connectionInfo)
                .$with(connection)
                .$send(payload);
    });

    connection.on("Publish", message => {
        const { payload } = mapper.$mapTo(message, JsonFormat);
        composer.$with(connectionInfo)
                .$with(connection)
                .$publish(payload);
    });

    await connectWithInitialRetry.call(this, connection, url);

    connection.onreconnecting(error => notify.$send(
        new HubReconnecting(connectionInfo, error)
    ));

    connection.onreconnected(connectionId => notify.$send(
        new HubReconnected(connectionInfo, connectionId)
    ));

    connections.set(url, connection);
    return connection;
}

async function connectWithInitialRetry(connection, url) {
    const start = Date.now();
    while (true) {
        try {
            await connection.start();
            return;
        } catch (error) {
            if (Date.now() - start > 10000) {
                throw new Error(`Unable to connect to the Hub at ${url}: ${error.message}`);
            }
            await Promise.delay(5000);
        }
    }
}

async function disconnectHub(url) {
    if ($isNothing(url))
        throw new Error("The url argument is required.");

    const connections = _(this).connections,
          connection  = connections.get(url);
    if (!$isNothing(connection)) {
        connections.delete(url);
        try {
            await connection.stop();
        } catch {
            // ignore
        }
    }
}
