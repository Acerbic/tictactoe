import { DoneInvokeEvent, spawn, assign } from "xstate";

import { MakeMoveResponse } from "@trulyacerbic/ttt-apis/gmaster-api";

import { emit_update_both } from "../actors";
import {
    GameRoomContext,
    GameRoom_PlayerQuit,
    GameRoom_PlayerReconnected
} from "../game-room-schema";

import { actionlog } from "./index";
import { emit_gameover } from "./emit_gameover";

// we need to use `assign` to register the spawned actor with the system
export const emit_update_and_gameover = assign<
    GameRoomContext,
    | GameRoom_PlayerQuit
    | DoneInvokeEvent<MakeMoveResponse>
    | GameRoom_PlayerReconnected
>((ctx, event, meta) => {
    actionlog("emit_update_and_gameover");

    const thePromise = emit_update_both(ctx).then(() =>
        /**
         * NOTE: Strictly speaking, you shouldn't reuse "action function" like
         * this, the fact that is exposed by "meta" data incompatibility.
         */
        emit_gameover(ctx, event, meta as any /* oof */)
    );

    spawn(thePromise, "emit_update_and_gameover");

    // no actual assignment, the actor is free-floating
    return {};
});
