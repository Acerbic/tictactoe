import { DoneInvokeEvent } from "xstate";
import { pure, send } from "xstate/lib/actions";

import { MakeMoveResponse } from "@trulyacerbic/ttt-apis/gmaster-api";

import { debuglog } from "../../../utils";
import { actionlog } from "./index";

import { GameRoomContext, GameRoom_PlayerQuit } from "../game-room-schema";
import { PlayersPool_PlayerDone } from "../../players-pool/players-pool-machine";

export const remove_done_players = pure<
    GameRoomContext,
    GameRoom_PlayerQuit | DoneInvokeEvent<MakeMoveResponse>
>((ctx, e) => {
    actionlog("remove_done_players");

    const actions: any[] = [];
    for (const pinfo of ctx.players.values()) {
        debuglog(
            "For player",
            pinfo.id,
            "socket is ",
            pinfo.socket.connected ? "connected" : "disconnected"
        );
        if (pinfo.socket.connected) {
            actions.push(
                send(
                    <PlayersPool_PlayerDone>{
                        type: "PLAYER_DONE",
                        player_id: pinfo.id
                    },
                    { to: "player_pool" }
                )
            );
        }
    }
    return actions;
});
