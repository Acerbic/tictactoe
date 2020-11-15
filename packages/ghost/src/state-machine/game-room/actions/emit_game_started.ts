import { DoneInvokeEvent } from "xstate";

import { API } from "@trulyacerbic/ttt-apis/ghost-api";
import { CreateGameResponse } from "@trulyacerbic/ttt-apis/gmaster-api";

import { debuglog, populate_update_meta } from "../../../utils";
import { actionlog, AF } from "./index";

export const emit_game_started: AF<DoneInvokeEvent<CreateGameResponse>> = (
    ctx,
    e
) => {
    actionlog("emit_game_started");

    // e.type === "done.invoke.invoke_create_game"
    const players = Array.from(ctx.players.values());
    const [p1, p2] = players;

    debuglog(">> emitting game_started for ", p1.id);
    p1.socket.emit("game_started", {
        opponentName: p2.name,
        gameId: ctx.game_id!,
        role: ctx.player1 == p1.id ? "first" : "second"
    });

    debuglog(">> emitting game_started for ", p2.id);
    p2.socket.emit("game_started", {
        opponentName: p1.name,
        gameId: ctx.game_id!,
        role: ctx.player1 == p2.id ? "first" : "second"
    });

    // technically a duplicate code from `emit_update_both`, but it is easier
    // this way, and forces order of emits (actions order in machine
    // definition can't be relied upon)
    const data: API["out"]["update"] = populate_update_meta(
        ctx,
        e.data.newState
    );
    ctx.players.forEach(player_context => {
        debuglog(">> emitting update for ", player_context.id);
        player_context.socket.emit("update", data);
    });
};
