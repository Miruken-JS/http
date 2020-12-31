import { HandlerBuilder, JsonMapping } from "@miruken/core";
import { HttpRouter } from "@/http-router";
import { XMLHttpRequestHandler } from "./xhr-handler";
import { ErrorMapping } from "@/error-mapping";
import "@/handler-http";

HandlerBuilder.implement({
    withXMLHttpRequestClient() {
        return this.addTypes(from => from.types(
            JsonMapping, HttpRouter, XMLHttpRequestHandler,
            ErrorMapping))
    }
});
