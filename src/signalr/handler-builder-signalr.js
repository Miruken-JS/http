import { HandlerBuilder, JsonMapping } from "@miruken/core";
import { HubRouter } from "./hub-router";
import "@miruken/validate";
import "./handler-hub";

HandlerBuilder.implement({
    withSignalR() {
        return this.addTypes(from => from.types(JsonMapping, HubRouter))
            .withValidation()
    }
});
