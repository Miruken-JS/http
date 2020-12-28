import { 
    Base, design
} from "miruken-core";

import { 
    Message, Request, response, typeId 
} from "miruken-callback";

export class Person extends Base {
    dob;
}

export class Player extends Base {
    id;
    name;
    @design(Person)
    person;
}

@typeId("Miruken.AspNetCore.Tests.PlayerResponse, Miruken.AspNetCore.Tests")
export class PlayerResponse {
    @design(Player)
    player;
}

@response(PlayerResponse)
@typeId("Miruken.AspNetCore.Tests.GetPlayer, Miruken.AspNetCore.Tests")
export class GetPlayer extends Request {
    playerId;
}

@response(PlayerResponse)
@typeId("Miruken.AspNetCore.Tests.CreatePlayer, Miruken.AspNetCore.Tests")
export class CreatePlayer extends Request {
    constructor(player) {
        super();
        this.player = player;
    }

    player;
}

@typeId("Miruken.AspNetCore.Tests.RenderPlayer, Miruken.AspNetCore.Tests")
export class RenderPlayer extends Request {
    constructor(player) {
        super();
        this.player = player;
    }

    player;
}

@typeId("Miruken.AspNetCore.Tests.PlayerCreated, Miruken.AspNetCore.Tests")
export class PlayerCreated extends Message {
    constructor(player) {
        super();
        this.player = player;
    }

    player;
}

@typeId("Miruken.AspNetCore.Tests.PlayerUpdated, Miruken.AspNetCore.Tests")
export class PlayerUpdated extends Message {
    constructor(player) {
        super();
        this.player = player;
    }

    player;
}
