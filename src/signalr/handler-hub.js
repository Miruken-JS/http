import { Handler } from "@miruken/core";
import { HubConnect, HubDisconnect } from "./hub-requests";

Handler.implement({
    $hubConnect(url) {
        return this.$send(new HubConnect(url));
    },
    $hubDisconnect(url) {
        return this.$send(new HubDisconnect(url));
    },
});