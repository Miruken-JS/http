import { 
    HandlerBuilder, Request, NotHandledError
} from "@miruken/core";

import { ValidationError } from "@miruken/validate";

import "@/signalr/handler-builder-signalr";

import { 
    Player, GetPlayer, CreatePlayer, RenderPlayer,
    PlayerResponse, PlayerCreated, PlayerUpdated
} from "../test-api";

import { expect } from "chai";

const TestApi = "https://localhost:5001/";

describe("HubRouter", () => {
    let handler;
    beforeEach(async () => {
        handler = new HandlerBuilder()
            .withSignalR()
            .withValidation()
            .build()
            .$httpOptions({ 
                baseUrl: TestApi,
                withCredentials: false
            });
    });

    it("should send requests to hub with options", async () => {
        const player = new Player().extend({
            name: "Philippe Coutinho"
        });
        const response = await handler
                .send(new CreatePlayer(player)
                .routeTo("hub:hub/miruken"));
        expect(response).to.be.instanceOf(PlayerResponse);
        expect(response.player.name).to.equal("Philippe Coutinho");
        expect(response.player.id).to.be.gt(0);
    }).timeout(5000);

    it("should send requests to hub with absolute route", async () => {
        const player = new Player().extend({
            name: "Lionel Messi"
        });
        const response = await handler
                .send(new CreatePlayer(player)
                .routeTo(`hub:${TestApi}hub/miruken`));
        expect(response).to.be.instanceOf(PlayerResponse);
        expect(response.player.name).to.equal("Lionel Messi");
        expect(response.player.id).to.be.gt(0);
    }).timeout(5000);

    it("should publish requests to hub with options", async () => {
        const player = new Player().extend({
            id:   8,
            name: "Philippe Coutinho"
        });
        const response = await handler
                .publish(new PlayerResponse(player)
                .routeTo("hub:hub/miruken"));
    }).timeout(5000);
});
