import { 
    HandlerBuilder, Request, NotHandledError, typeId
} from "@miruken/core";

import { ValidationError } from "@miruken/validate";

import { HubConnectionInfo } from "@/signalr/hub-requests";
import "@/signalr/handler-builder-signalr";

import { 
    Player, GetPlayer, CreatePlayer, RenderPlayer,
    PlayerResponse, PlayerCreated, PlayerUpdated
} from "../test-api";

import { expect } from "chai";

const TestApi    = "https://localhost:5001/",
      TestApiHub = "hub:hub/miruken";

describe.skip("HubRouter", () => {
    let handler;
    beforeEach(async () => {
        handler = new HandlerBuilder()
            .withSignalR()
            .build()
            .$httpOptions({ 
                baseUrl: TestApi,
                withCredentials: false
            });
    });

    it("should connect to hub", async () => {
        const hub            = TestApiHub.substring(4),
              connectionInfo = await handler.$hubConnect(hub);
        expect(connectionInfo).to.be.instanceOf(HubConnectionInfo);
        expect(connectionInfo.url).to.equal(`${TestApi}${hub}`);
        await handler.$hubDisconnect(connectionInfo.url);
    });

    it("should send requests to hub with options", async () => {
        const player = new Player().extend({
            name: "Philippe Coutinho"
        });
        const response = await handler
                .$send(new CreatePlayer(player)
                .routeTo(TestApiHub));
        expect(response).to.be.instanceOf(PlayerResponse);
        expect(response.player.name).to.equal("Philippe Coutinho");
        expect(response.player.id).to.be.gt(0);
    });

    it("should send requests to hub with absolute route", async () => {
        const player = new Player().extend({
            name: "Lionel Messi"
        });
        const response = await handler
                .$send(new CreatePlayer(player)
                .routeTo(`hub:${TestApi}hub/miruken`));
        expect(response).to.be.instanceOf(PlayerResponse);
        expect(response.player.name).to.equal("Lionel Messi");
        expect(response.player.id).to.be.gt(0);
    });

    it("should publish requests to hub with options", async () => {
        const player = new Player().extend({
            id:   8,
            name: "Philippe Coutinho"
        });
        await handler.$publish(new PlayerCreated(player)
                     .routeTo(TestApiHub));
    });

    it.skip("should reject invalid hub", async () => {
        try {
            await handler.$send(new CreatePlayer().routeTo("hub://localhost:9000"));     
            expect.fail("Should have failed");                 
        } catch (error) {
            expect(error.message).to.equal(
                "Unable to connect to the Hub at https://localhost:9000/: Failed to fetch");
        }
    }).timeout(20000);

    it("should fail unhandled requests", async () => {
        @typeId("Miruken.AspNetCore.Tests.PromotePlayer, Miruken.AspNetCore.Tests")
        class PromotePlayer extends Request {
            playerId;
        }
        try {
            await handler.$send(new PromotePlayer(1).routeTo(TestApiHub));
        } catch (error) {
            expect(error.message).to.match(
                /An unexpected error occurred invoking 'Process' on the server. JsonSerializationException: Error resolving type specified in JSON 'Miruken.AspNetCore.Tests.PromotePlayer,Miruken.AspNetCore.Tests'. Path '[$]type'/
            );
        }
    });

    it("should batch single request", async () => {
        const player  = new Player().extend({ name: "Paul Pogba" }),
              results = await handler.$batch(batch =>
            batch.$send(new CreatePlayer(player)
                    .routeTo(TestApiHub)).then(response => {
                expect(response.player.name).to.equal("Paul Pogba");
                expect(response.player.id).to.be.gt(0);
            })
        );
        expect(results.length).to.equal(1);
        const [groups] = results;
        expect(groups.length).to.equal(1);
        const [{ uri, responses }] = groups; 
        expect(uri).to.equal(TestApiHub);
        expect(responses.length).to.equal(1);
        const [response] = responses;
        expect(response).to.be.instanceOf(PlayerResponse);
        expect(response.player.name).to.equal("Paul Pogba");
        expect(response.player.id).to.be.gt(0);
    });

    it("should batch multiple request", async () => {
        const player1 = new Player().extend({ name: "Paul Pogba" }),
              player2 = new Player().extend({ name: "Eden Hazard" }),
              results = await handler.$batch(batch => {
            batch.$send(new CreatePlayer(player1)
                 .routeTo(TestApiHub)).then(response => {
                     expect(response.player.name).to.equal("Paul Pogba");
                     expect(response.player.id).to.be.gt(0);
                 });
            batch.$send(new CreatePlayer(player2)
                 .routeTo(TestApiHub)).then(response => {
                     expect(response.player.name).to.equal("Eden Hazard");
                     expect(response.player.id).to.be.gt(0);
                });
        });
        expect(results.length).to.equal(1);
        const [groups] = results;
        expect(groups.length).to.equal(1);
        const [{ uri, responses }] = groups; 
        expect(uri).to.equal(TestApiHub);
        expect(responses.length).to.equal(2);
    });

    it("should not batch awaited request", async () => {
        const player1 = new Player().extend({ name: "Paul Pogba" }),
              player2 = new Player().extend({ name: "Eden Hazard" }),
              results = await handler.$batch(async batch => {
            const response = await batch.$send(
                new CreatePlayer(player1).routeTo(TestApiHub));
            expect(response.player.name).to.equal("Paul Pogba");
            expect(response.player.id).to.be.gt(0);
            await batch.$send(new CreatePlayer(player2)
                 .routeTo(TestApiHub)).then(response => {
                     expect(response.player.name).to.equal("Eden Hazard");
                     expect(response.player.id).to.be.gt(0);
                });
        });
    });

    it("should batch publications", async () => {
        const player1 = new Player().extend({ id: 11, name: "Paul Pogba" }),
              player2 = new Player().extend({ id: 12, name: "Eden Hazard" }),
              results = await handler.$batch(batch => {
            batch.$publish(new PlayerCreated(player1).routeTo(TestApiHub));
            batch.$publish(new PlayerUpdated(player2).routeTo(TestApiHub));
        });
        expect(results.length).to.equal(1);
        const [groups] = results;
        expect(groups.length).to.equal(1);
        const [{ uri, responses }] = groups; 
        expect(uri).to.equal(TestApiHub);
        expect(responses.length).to.equal(2);
    });

    it("should propagate failure", async () => {
        const results = await handler.$batch(batch =>
            batch.$send(new CreatePlayer(new Player())
                    .routeTo(TestApiHub)).then(response => {
                expect.fail("Should have failed.")
            }).catch(error => {
                expect(error).to.be.instanceOf(ValidationError);
                expect(error.results.Player.Name.errors.server).to.eql([
                    { message: "'Player. Name' must not be empty." }
                ]);
            })
        );
        expect(results.length).to.equal(1);
        const [groups] = results;
        expect(groups.length).to.equal(1);
        const [{ uri, responses }] = groups; 
        expect(uri).to.equal(TestApiHub);
        expect(responses.length).to.equal(1);
    });

    it("should propagate multiple failures", async () => {
        const results = await handler.$batch(batch => {
            batch.$send(new CreatePlayer(new Player())
                    .routeTo(TestApiHub)).then(response => {
                    expect.fail("Should have failed.")
                }).catch(error => {
                    expect(error).to.be.instanceOf(ValidationError);
                    expect(error.results.Player.Name.errors.server).to.eql([
                        { message: "'Player. Name' must not be empty." }
                    ]);
                });
            batch.$send(new CreatePlayer(new Player().extend({
                    id:   3,
                    name: "Sergio Ramos"
                })).routeTo(TestApiHub)).then(response => {
                    expect.fail("Should have failed.")
                }).catch(error => {
                    expect(error).to.be.instanceOf(ValidationError);
                    expect(error.results.Player.Id.errors.server).to.eql([
                        { message: "'Player. Id' must be equal to '0'." }
                    ]);
                });
        });
        expect(results.length).to.equal(1);
        const [groups] = results;
        expect(groups.length).to.equal(1);
        const [{ uri, responses }] = groups; 
        expect(uri).to.equal(TestApiHub);
        expect(responses.length).to.equal(2);    
    });
});
