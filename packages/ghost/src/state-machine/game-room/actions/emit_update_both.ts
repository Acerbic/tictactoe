import { MakeMoveResponse } from "@trulyacerbic/ttt-apis/gmaster-api";
import { debuglog, populate_update_meta } from "../../../utils";
import { DoneInvokeEvent } from "xstate";
import {
    GameRoom_PlayerQuit,
    GameRoom_PlayerReconnected
} from "../game-room-schema";
import { AF, actionlog } from "./index";
import { API } from "@trulyacerbic/ttt-apis/ghost-api";

// we need to use `assign` to register the spawned actor with the system
export const emit_update_both: AF<
    | GameRoom_PlayerQuit
    | DoneInvokeEvent<MakeMoveResponse>
    | GameRoom_PlayerReconnected
> = (ctx, event) => {
    actionlog("emit_update_both");

    const data: API["out"]["update"] = populate_update_meta(
        ctx,
        event.type === "done.invoke.invoke_make_move"
            ? event.data.newState
            : ctx.game_state!
    );

    ctx.players.forEach(player_context => {
        debuglog(">> emitting update for ", player_context.id);
        player_context.socket.emit("update", data);
    });
};
