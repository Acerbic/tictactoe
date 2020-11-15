/**
 * Functions that generates a Promise Actor
 */

import { errorlog, debuglog, populate_update_meta } from "../../../utils";

import { GameRoomContext } from "../game-room-schema";
import { API } from "@trulyacerbic/ttt-apis/ghost-api";

// we need to use `assign` to register the spawned actor with the system
export const emit_update_both = (ctx: GameRoomContext) => {
    const thePromise = ctx.gm_connect
        .get("CheckGame", ctx.game_id!)
        .then(response => {
            // update players' game situation knowledge
            const data: API["out"]["update"] = populate_update_meta(
                ctx,
                response.state
            );

            ctx.players.forEach(player_context => {
                debuglog(">> emitting update for ", player_context.id);
                player_context.socket.emit("update", data);
            });
        })
        .catch(reason => {
            errorlog(
                "emit_update_both failed for game id %s, reason:",
                ctx.game_id,
                reason
            );
            //TODO:
            throw reason;
        });

    return thePromise;
};
