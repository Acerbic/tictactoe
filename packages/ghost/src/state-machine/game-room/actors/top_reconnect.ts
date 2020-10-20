/**
 * Function that generates a Promise Actor
 */

import { errorlog, populate_update_meta } from "../../../utils";

import {
    GameRoomContext,
    GameRoom_PlayerReconnected
} from "../game-room-schema";
import { API } from "@trulyacerbic/ttt-apis/ghost-api";
import { GMasterError } from "../../../connectors/gmaster_connector";

// we need to use `assign` to register the spawned actor with the system
export const top_reconnect = (
    ctx: GameRoomContext,
    event: GameRoom_PlayerReconnected
) => {
    return ctx.gm_connect
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
};
