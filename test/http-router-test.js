import { 
    HandlerBuilder, Request, typeId, NotHandledError
} from "@miruken/core";

import { ValidationError } from "@miruken/validate";

import "@/xhr/handler-builder-xhr";

import { 
    Player, GetPlayer, CreatePlayer, RenderPlayer,
    PlayerResponse, PlayerCreated, PlayerUpdated
} from "./test-api";

import { expect } from "chai";

const TestApi = "https://localhost:5001/";

describe.skip("HttpRouter", () => {
    let handler;
    beforeEach(async () => {
        handler = new HandlerBuilder()
            .withXMLHttpRequestClient()
            .build()
            .$httpOptions({ 
                baseUrl: TestApi
            });
    });

    it("should route requests over http(s)", async () => {
        const player = new Player().extend({
            name: "Philippe Coutinho"
        });
        const response = await handler
                .$send(new CreatePlayer(player)
                .routeTo(TestApi));
        expect(response).to.be.instanceOf(PlayerResponse);
        expect(response.player.name).to.equal("Philippe Coutinho");
        expect(response.player.id).to.be.gt(0);
    });

    it("should fail unhandled requests", async () => {
        @typeId("Miruken.AspNetCore.Tests.PromotePlayer, Miruken.AspNetCore.Tests")
        class PromotePlayer extends Request {
            playerId;
        }
        try {
            await handler.$send(new PromotePlayer(1).routeTo(TestApi));
        } catch (error) {
            expect(error).to.be.instanceOf(ValidationError);
            expect(error.results.payload.$type.payload.errors.server).to.eql([
                { message: "Error resolving type specified in JSON 'Miruken.AspNetCore.Tests.PromotePlayer,Miruken.AspNetCore.Tests'. Path 'payload.$type', line 1, position 85." }
            ]);
        }
    });

    it("should reject invalid route", async () => {
        try {
            await handler.$send(new CreatePlayer().routeTo("abc://localhost:9000"));     
            expect.fail("Should have failed");                 
        } catch (error) {
            expect(error).to.be.instanceOf(NotHandledError);
        }
    });

    it("should batch single request", async () => {
        const player  = new Player().extend({ name: "Paul Pogba" }),
              results = await handler.$batch(batch =>
            batch.$send(new CreatePlayer(player)
                    .routeTo(TestApi)).then(response => {
                expect(response.player.name).to.equal("Paul Pogba");
                expect(response.player.id).to.be.gt(0);
            })
        );
        expect(results.length).to.equal(1);
        const [groups] = results;
        expect(groups.length).to.equal(1);
        const [{ uri, responses }] = groups; 
        expect(uri).to.equal(TestApi);
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
                 .routeTo(TestApi)).then(response => {
                     expect(response.player.name).to.equal("Paul Pogba");
                     expect(response.player.id).to.be.gt(0);
                 });
            batch.$send(new CreatePlayer(player2)
                 .routeTo(TestApi)).then(response => {
                     expect(response.player.name).to.equal("Eden Hazard");
                     expect(response.player.id).to.be.gt(0);
                });
        });
        expect(results.length).to.equal(1);
        const [groups] = results;
        expect(groups.length).to.equal(1);
        const [{ uri, responses }] = groups; 
        expect(uri).to.equal(TestApi);
        expect(responses.length).to.equal(2);
    });

    it("should not batch awaited request", async () => {
        const player1 = new Player().extend({ name: "Paul Pogba" }),
              player2 = new Player().extend({ name: "Eden Hazard" }),
              results = await handler.$batch(async batch => {
            const response = await batch.$send(
                new CreatePlayer(player1).routeTo(TestApi));
            expect(response.player.name).to.equal("Paul Pogba");
            expect(response.player.id).to.be.gt(0);
            await batch.$send(new CreatePlayer(player2)
                 .routeTo(TestApi)).then(response => {
                     expect(response.player.name).to.equal("Eden Hazard");
                     expect(response.player.id).to.be.gt(0);
                });
        });
    });

    it("should batch publications", async () => {
        const player1 = new Player().extend({ name: "Paul Pogba" }),
              player2 = new Player().extend({ name: "Eden Hazard" }),
              results = await handler.$batch(batch => {
            batch.$publish(new PlayerCreated(player1).routeTo(TestApi));
            batch.$publish(new PlayerUpdated(player2).routeTo(TestApi));
        });
        expect(results.length).to.equal(1);
        const [groups] = results;
        expect(groups.length).to.equal(1);
        const [{ uri, responses }] = groups; 
        expect(uri).to.equal(TestApi);
        expect(responses.length).to.equal(2);
    });

    it("should propagate failure", async () => {
        const results = await handler.$batch(batch =>
            batch.$send(new CreatePlayer(new Player())
                    .routeTo(TestApi)).then(response => {
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
        expect(uri).to.equal(TestApi);
        expect(responses.length).to.equal(1);
    });

    it("should propagate multiple failures", async () => {
        const results = await handler.$batch(batch => {
            batch.$send(new CreatePlayer(new Player())
                    .routeTo(TestApi)).then(response => {
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
                })).routeTo(TestApi)).then(response => {
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
        expect(uri).to.equal(TestApi);
        expect(responses.length).to.equal(2);    
    });

    it("should propagate format errors", async () => {
        try {
            await handler.$httpPost(
                TestApi + "process",
                `{
                    'payload': {
                        '$type': 'Miruken.AspNetCore.Tests.CreatePlayer, Miruken.AspNetCore.Tests',
                        'player': {
                            'id':   'ABC',
                            'name': 'Namee3c27ad6-b812-46c1-9b60-d99c9d3e7ba6',
                                'person': {
                                'dob': 'XYZ'
                            }
                        }
                    }
                }`);
        } catch (error) {
            const { payload } = error.content;
            expect(payload).to.be.instanceOf(ValidationError);
            expect(payload.results.payload.errors.server.length).to.equal(2);
        }
    });

    it("should handle missing type good tatus", async () => {
        try {
            await handler
                .$send(new RenderPlayer(new Player())
                .routeTo(TestApi + "no-type-good/"));
        } catch (error) {
            expect(error).to.be.instanceOf(TypeError);
            expect(error.message).to.equal(
                "The type with id 'Miruken.AspNetCore.Tests.SomeError, Miruken.AspNetCore.Tests' could not be resolved and no fallback type was provided.");
        }
    });

    it("should handle missing type bad tatus", async () => {
        try {
            await handler
                .$send(new CreatePlayer(new Player())
                .routeTo(TestApi + "no-type-bad/"));  
        } catch (error) {
            expect(error).to.be.instanceOf(TypeError);
            expect(error.message).to.equal(
                "The type with id 'Miruken.AspNetCore.Tests.SomeError, Miruken.AspNetCore.Tests' could not be resolved and no fallback type was provided.");
        }
    });
});
