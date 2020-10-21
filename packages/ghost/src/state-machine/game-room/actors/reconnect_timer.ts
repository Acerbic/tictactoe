/**
 * A function that creates a Callback Actor
 */

import { InvokeCallback } from "xstate";

import { PlayerId } from "@trulyacerbic/ttt-apis/gmaster-api";
import {
    DISCONNECT_FORFEIT_TIMEOUT,
    GameRoom_PlayerDisconnectTimeout
} from "../game-room-schema";
import { debuglog } from "../../../utils";

export const ABORT_TIMER_EVENT = "ABORT_TIMER";

export const reconnect_timer = (player_id: PlayerId): InvokeCallback => {
    debuglog("reconnect timer generator called for player", player_id);
    return (callback, onReceive) => {
        debuglog("reconnect timer started", player_id);
        const timeout: NodeJS.Timeout = setTimeout(() => {
            debuglog("reconnect timer ended", player_id);
            // when timer is done, send an event to the parent
            callback(<GameRoom_PlayerDisconnectTimeout>{
                type: "DISCONNECT_TIMEOUT",
                player_id
            });
        }, DISCONNECT_FORFEIT_TIMEOUT);

        onReceive(event => {
            debuglog("reconnect timer recieved event:", event.type);
            if (event.type === ABORT_TIMER_EVENT) {
                debuglog(
                    "reconnect timer clearing by termination event",
                    player_id
                );
                clearTimeout(timeout);
            }
        });

        return () => {
            debuglog(
                "clearing reconnect timer for player",
                player_id,
                (timeout as any)._destroyed
            );
            clearTimeout(timeout);
        };
    };
};

export default reconnect_timer;
