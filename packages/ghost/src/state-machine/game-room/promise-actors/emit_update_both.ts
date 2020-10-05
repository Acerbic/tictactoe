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
import { chain_promise } from "../../../utils";

// we need to use `assign` to register the spawned actor with the system
export const emit_update_both = assign<GameRoomContext, GameRoomEvent>(ctx => {
    actionlog("emit_update_both");

    const thePromise = ctx.gm_connect
        .get("CheckGame", ctx.game_id!)
        .then(response => {
            // update players' game situation knowledge
            const data: API["out"]["update"] = populate_update_meta(
                ctx,
                response.state
            );

            chain_promise(ctx, () => {
                ctx.players.forEach(player_context => {
                    debuglog(">> emitting update for ", player_context.id);
                    player_context.socket.emit("update", data);
                });
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

    spawn(thePromise, "emit_update_both");

    // no actual assignment, the actor is free-floating
    return {};
});
