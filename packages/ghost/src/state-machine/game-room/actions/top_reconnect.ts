import { spawn } from "xstate";
import { assign } from "xstate/lib/actions";

import { actionlog } from "./index";
import { GameRoomContext, GameRoomEvent } from "../game-room-schema";
import * as actors from "../actors";

export const top_reconnect = assign<GameRoomContext, GameRoomEvent>(
    (ctx, event) => {
        actionlog("top_reconnect");
        if (event.type !== "SOC_RECONNECT") {
            return {};
        }

        // reconnection during game in progress - update socket

        // Note: this is a bit cheesy to just plop assignment inside "assign"
        // already, but it is more concise than fiddling with Map
        ctx.players.get(event.player_id)!.socket = event.socket;

        const thePromise = actors.top_reconnect(ctx, event);
        spawn(thePromise, `top_reconnect_${event.player_id}`);

        // no actual ref assignment, the actor is free-floating
        return {};
    }
);
