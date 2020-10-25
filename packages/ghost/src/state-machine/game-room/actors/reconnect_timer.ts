/**
 * A function that creates a Callback Actor.
 *
 * Callback emits PlayerDisconnectTimeout after a timeout, unless it is
 * terminated before give time interval.
 */

import { InvokeCallback } from "xstate";

import { PlayerId } from "@trulyacerbic/ttt-apis/gmaster-api";
import { debuglog } from "../../../utils";

/**
 * Happens if in a middle of a game disconnect was not followed with a reconnect
 * within a grace period.
 * This event is being sent to the parent (via callback)
 */
export type PlayerDisconnectTimeout = {
    type: "DISCONNECT_TIMEOUT";
    player_id: PlayerId;
};

export const reconnect_timer = (
    player_id: PlayerId,
    time: number
): InvokeCallback => {
    debuglog("reconnect timer generator called for player", player_id);
    return (callback, onReceive) => {
        debuglog("reconnect timer started", player_id);
        const timeout: NodeJS.Timeout = setTimeout(() => {
            debuglog("reconnect timer ended", player_id);
            // when timer is done, send an event to the parent
            callback(<PlayerDisconnectTimeout>{
                type: "DISCONNECT_TIMEOUT",
                player_id
            });
        }, time);

        return () => {
            debuglog("clearing reconnect timer for player", player_id);
            clearTimeout(timeout);
        };
    };
};

export default reconnect_timer;
