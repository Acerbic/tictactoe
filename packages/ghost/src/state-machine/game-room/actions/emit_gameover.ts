import { DoneInvokeEvent } from "xstate";

import { API } from "@trulyacerbic/ttt-apis/ghost-api";
import { MakeMoveResponse } from "@trulyacerbic/ttt-apis/gmaster-api";

import {
    GameRoom_PlayerQuit,
    GameRoom_PlayerReconnected,
    isGREvent
} from "../game-room-schema";
import { actionlog, AF } from "./index";

export const emit_gameover: AF<
    | GameRoom_PlayerQuit
    | DoneInvokeEvent<MakeMoveResponse>
    | GameRoom_PlayerReconnected
> = (ctx, e) => {
    actionlog("emit_gameover");

    let winner: API["out"]["gameover"]["winner"] = null;

    if (isGREvent(e, "SOC_PLAYER_QUIT")) {
        // game ended with a rage quit
        if (ctx.player1 === e.player_id) {
            winner = ctx.player2!;
        } else if (ctx.player2 === e.player_id) {
            winner = ctx.player1!;
        } else {
            // this should not happen!
        }
    } else if (isGREvent(e, "SOC_RECONNECT")) {
        winner = ctx.game_winner;
    } else {
        // normal game finish
        const gameState = e.data.newState;
        if (gameState.game === "over") {
            if (gameState.turn === "player1") {
                winner = ctx.player2!;
            } else {
                winner = ctx.player1!;
            }
        }
    }

    ctx.players.forEach(player_context =>
        player_context.socket.emit("gameover", { winner })
    );
};
