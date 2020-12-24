import { HandlerBuilder } from "miruken-callback";
import "../src/xhr/handler-builder-xhr";
import { 
    Player, GetPlayer, CreatePlayer, PlayerResponse
} from "./test-api";

import { expect } from "chai";

const TestApi = "https://localhost:5001/";

describe.only("HttpRouter", () => {
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
                .send(new CreatePlayer(player)
                .routeTo(TestApi));
        expect(response).to.be.instanceOf(PlayerResponse);
        expect(response.player.name).to.equal("Philippe Coutinho");
        expect(response.player.id).to.be.gt(0);
    });
});
