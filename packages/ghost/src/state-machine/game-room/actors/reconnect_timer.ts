/**
 * A function that creates a Callback Actor
 */

import { InvokeCallback } from "xstate";

import { PlayerId } from "@trulyacerbic/ttt-apis/gmaster-api";
import {
    DISCONNECT_FORFEIT_TIMEOUT,
    GameRoom_PlayerDisconnectTimeout
} from "../game-room-schema";

export const ABORT_TIMER_EVENT = "ABORT_TIMER";

export const reconnect_timer = (player_id: PlayerId): InvokeCallback => (
    callback,
    onReceive
) => {
    const timeout: NodeJS.Timeout = setTimeout(() => {
        // when timer is done, send an event to the parent
        callback(<GameRoom_PlayerDisconnectTimeout>{
            type: "DISCONNECT_TIMEOUT",
            player_id
        });
    }, DISCONNECT_FORFEIT_TIMEOUT);

    onReceive(event => {
        if (event.type === ABORT_TIMER_EVENT) {
            clearTimeout(timeout);
        }
    });

    return () => clearInterval(timeout);
};

export default start_reconnect_timer;
