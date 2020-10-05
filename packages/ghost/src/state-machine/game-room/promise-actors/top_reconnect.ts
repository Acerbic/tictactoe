import { spawn, assign } from "xstate";

import {
    statelog,
    hostlog,
    errorlog,
    debuglog,
    populate_update_meta
} from "../../../utils";
import debug from "debug";
const actionlog = debug("ttt:ghost:action");

import { GameRoomContext, GameRoomEvent } from "../game-room-schema";
import { API } from "@trulyacerbic/ttt-apis/ghost-api";
import { GMasterError } from "../../../connectors/gmaster_connector";

// we need to use `assign` to register the spawned actor with the system
export const top_reconnect = assign<GameRoomContext, GameRoomEvent>(
    (ctx, event) => {
        if (event.type !== "SOC_RECONNECT") {
            return {};
        }

        actionlog("top_reconnect");

        // reconnection during game in progress - update socket

        // Note: this is a bit cheesy to just plop assignment inside "assign"
        // already, but it is more concise than fiddling with Map
        ctx.players.get(event.player_id)!.socket = event.socket;

        const thePromise = ctx.gm_connect
            .get("CheckGame", ctx.game_id!)
            .then(response => {
                // update reconnected player's knowledge
                const data: API["out"]["update"] = response.state;
                event.socket.emit("update", populate_update_meta(ctx, data));
            })
            .catch(reason => {
                errorlog(
                    "Actor: Failed 'top_reconnect' update sequence, for player id %s on socket %s. Reason: ",
                    event.player_id,
                    event.socket.id,
                    reason
                );

                const message =
                    reason instanceof GMasterError
                        ? reason.message
                        : "Failed to reconnect";

                event.socket.emit("server_error", {
                    message,
                    abandonGame: true
                });

                throw reason; // this should result in "error.platform.top_reconnect" event
            });

        spawn(thePromise, "top_reconnect");

        // no actual ref assignment, the actor is free-floating
        return {};
    }
);
