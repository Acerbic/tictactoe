import { spawn } from "xstate";
import { assign } from "xstate/lib/actions";

import * as actors from "../actors";
import { GameRoomContext, GameRoomEvent } from "../game-room-schema";
import { actionlog } from "./index";

// we need to use `assign` to register the spawned actor with the system
export const emit_update_both = assign<GameRoomContext, GameRoomEvent>(ctx => {
    actionlog("emit_update_both");

    const thePromise = actors.emit_update_both(ctx);

    spawn(thePromise, "emit_update_both");

    // no actual assignment, the actor is free-floating
    return {};
});
