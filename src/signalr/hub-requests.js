
export class HubConnectionInfo {
    constructor(id, url) {
        this.id  = id;
        this.url = url;
    }

    id;
    url;
}

export class HubConnect {
    constructor(url) {
        this.url = url;
    }

    url;
}

export class HubDisconnect {
    constructor(url) {
        this.url = url;
    }

    url;
}

export class HubEvent {
    constructor(connectionInfo) {
        if (new.target === HubEvent) {
            throw new TypeError("HubEvent cannot be instantiated.");
        }

        this.connectionInfo = connectionInfo;
    }

    connectionInfo;
}

export class HubReconnecting extends HubEvent {
    constructor(connectionInfo, error) {
        super(connectionInfo);
        this.error = error;
    }

    error;
}

export class HubReconnected extends HubEvent {
    constructor(connectionInfo, newConnectionId) {
        super(connectionInfo);
        this.newConnectionId = newConnectionId;
    }

    newConnectionId;
}

export class HubClosed extends HubEvent {
        constructor(connectionInfo, error) {
        super(connectionInfo);
        this.error = error;
    }

    error;
}

