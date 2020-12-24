import { 
    Base, design
} from "miruken-core";

import { 
    Request, response, typeId 
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
