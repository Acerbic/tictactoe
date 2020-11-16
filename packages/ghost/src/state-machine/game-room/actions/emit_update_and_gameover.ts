import { DoneInvokeEvent } from "xstate";

import { MakeMoveResponse } from "@trulyacerbic/ttt-apis/gmaster-api";

import { emit_update_both } from "./emit_update_both";
import {
    GameRoom_PlayerQuit,
    GameRoom_PlayerReconnected
} from "../game-room-schema";

import { actionlog, AF } from "./index";
import { emit_gameover } from "./emit_gameover";

// we need to use `assign` to register the spawned actor with the system
export const emit_update_and_gameover: AF<
    | GameRoom_PlayerQuit
    | DoneInvokeEvent<MakeMoveResponse>
    | GameRoom_PlayerReconnected
> = (ctx, event, meta) => {
    actionlog("emit_update_and_gameover");

    emit_update_both(ctx, event, meta);
    emit_gameover(ctx, event, meta);
};
