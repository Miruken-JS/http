import { 
    $isNothing, handles, provides,
    singleton, Routed, routes, options,
    TypeIdHandling, JsonFormat, createKey
} from "@miruken/core";

import { HttpOptions } from "../http-options";
import { HubOptions } from "./hub-options";

import { 
    HubConnect, HubDisconnect,
    HubReconnecting, HubReconnected, HubClosed
} from "./hub-requests";

import { UnknownPayloadError } from "../unknown-payload-error";
import "./handler-hub";

import { 
    HubConnectionBuilder, HubConnectionInfo, HubConnectionState,
} from "@microsoft/signalr";

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

        const baseUrl = hubOptions?.baseUrl || httpOptions?.baseUrl,
              url     = new URL(routed.route.substring(4), baseUrl).href;

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
                  response = mapper.$mapTo(result, JsonFormat);
            return response?.payload;
        }
    }

    @handles(HubConnect)
    async connect(connect,
        @options(HubOptions)  hubOptions,
        @options(HttpOptions) httpOptions,
        { composer }) {
        const connection = await getConnection.call(
            this, connect.url, hubOptions, httpOptions, composer, connect);
        return getConnectionInfo(connection, connect.url);
    }

    @handles(HubDisconnect)
    async disconnect(disconnect) {
        await disconnect.call(this, disconnect.url);
    }
}

function getConnectionInfo(connection, url) {
    return new HubConnectionInfo(connection.connectionId, url);
}

async function getConnection(url, hubOptions, httpOptions, composer, connect) {
    const connections = _(this).connections;
    let   connection  = connections.get(url);

    if (!$isNothing(connection) &&
         connection.state != HubConnectionState.Disconnected) {
        if (!$isNothing(connect)) {
            throw new Error(`A connection to the Hub @ ${url} already exists.`);
        }
        return connection;
    }

    await disconnect.call(this, url);

    let builder = new HubConnectionBuilder().withUrl(url);
    if (!$isNothing(hubOptions?.protocol)) {
        builder = builder.withHubProtocol(hubOptions.protocol);
    }
    if (!$isNothing(hubOptions?.automaticReconnect)) {
        builder = builder.withAutomaticReconnect(hubOptions.automaticReconnect);
    }
    if (!$isNothing(httpOptions)) {
        builder.httpConnectionOptions = { 
            withCredentials: httpOptions?.withCredentials
        };
    }

    connection = builder.build();

    if (!$isNothing(hubOptions?.serverTimeoutInMilliseconds)) {
        connection.serverTimeoutInMilliseconds = hubOptions.serverTimeoutInMilliseconds;
    }
    if (!$isNothing(hubOptions?.keepAliveIntervalInMilliseconds)) {
        connection.keepAliveIntervalInMilliseconds = hubOptions.keepAliveIntervalInMilliseconds;
    }

    const mapper = composer.$mapOptions({ typeIdHandling: TypeIdHandling.Auto }),
          notify = composer.$notify();

    connection.onclose(async error => {
        const closed = new HubClosed(getConnectionInfo(connection, url), error);
        notify.send(closed);
        if ($isNothing(error)) {
            await disconnect.call(this, url);
        } else {
            await connectWithInitialRetry.call(this, connection, url);
        }
    });

    connection.on("Process", message => {
        const { payload } = mapper.$mapTo(message, JsonFormat);
        composer.$with(getConnectionInfo(connection, url))
                .$with(connection)
                .send(payload);
    });

    connection.on("Publish", message => {
        const { payload } = mapper.$mapTo(message, JsonFormat);
        composer.$with(getConnectionInfo(connection, url))
                .$with(connection)
                .publish(payload);
    });

    await connectWithInitialRetry.call(this, connection, url);

    connection.onreconnecting(error => notify.send(
        new HubReconnecting(getConnectionInfo(connection, url), error)
    ));

    connection.onreconnected(connectionId => notify.send(
        new HubReconnected(getConnectionInfo(connection, connectionId), error)
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
            if (Date.now() - start > 30000) {
                throw new Error(`Unable to connect to the Hub at ${url}: ${error.message}`);
            }
            await Promise.delay(5000);
        }
    }
}

async function disconnect(url) {
    if ($isNothing(url))
        throw new Error("The url argument is required.");

    const connection =  _(this).connections.get(url);
    if (!$isNothing(connection)) {
        await connection.stop();
    }
}
