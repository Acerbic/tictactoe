import { DoneInvokeEvent } from "xstate";
import { assign } from "xstate/lib/actions";

import { MakeMoveResponse } from "@trulyacerbic/ttt-apis/gmaster-api";

import { GameRoomContext } from "../game-room-schema";

/**
 * Preserve end game winner to (possibly) send updates about it later
 */
export const store_winner = assign<
    GameRoomContext,
    DoneInvokeEvent<MakeMoveResponse>
>({
    game_winner: (ctx, event) => {
        const gameState = event.data.newState;
        if (gameState.game === "over") {
            if (gameState.turn === "player1") {
                return ctx.player2!;
            } else {
                return ctx.player1!;
            }
        }
        return null;
    }
});
