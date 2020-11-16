import { DoneInvokeEvent } from "xstate";
import { assign } from "xstate/lib/actions";

import { MakeMoveResponse } from "@trulyacerbic/ttt-apis/gmaster-api";

import { GameRoomContext } from "../game-room-schema";

/**
 * Preserve the latest game state
 */
export const store_game_state = assign<
    GameRoomContext,
    DoneInvokeEvent<MakeMoveResponse>
>({
    game_state: (_, event) => event.data.newState
});
