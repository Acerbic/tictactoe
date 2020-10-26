/**
 * State of connection of multiple players.
 *
 * Initialized with a set of player connection objects in the context. When that
 * set reaches size of 0 - this machine terminates. For each player it tracks
 * its connection/reconnection timer, and if timer exceeds reconnection window,
 * the parent machine is notified with a PlayerDisconnectTimeout event.
 *
 * The parent machine passes events about disconnection/reconnection of players
 * to this machine, and also imperatively removes players from the tracked set
 * with PlayersPool_PlayerDone event.
 *
 * A player will be removed if
 *  - he disconnected for too long
 *  - he explicitly quit
 *  - the game ended by valid game means.
 */

import { Machine, assign, spawn, Actor } from "xstate";
import { pure, sendParent } from "xstate/lib/actions";
import debug from "debug";

const actionlog = debug("ttt:ghost:action:players");

import { PlayerId } from "@trulyacerbic/ttt-apis/gmaster-api";
import {
    GameRoom_PlayerDisconnected,
    GameRoom_PlayerReconnected,
    GameRoom_Shutdown,
    DISCONNECT_FORFEIT_TIMEOUT
} from "../game-room/game-room-schema";

import {
    reconnect_timer,
    PlayerDisconnectTimeout
} from "../game-room/actors/reconnect_timer";
export { PlayerDisconnectTimeout } from "../game-room/actors/reconnect_timer";

import { UnexpectedEvent } from "../../utils";

export type PlayersPool_PlayerDone = {
    type: "PLAYER_DONE";
    player_id: PlayerId;
};
export type PlayersPoolEvent =
    | GameRoom_PlayerDisconnected
    | GameRoom_PlayerReconnected
    | PlayerDisconnectTimeout
    | PlayersPool_PlayerDone
    | GameRoom_Shutdown;

export interface PlayersPoolContext {
    playerConnections: Map<
        PlayerId,
        {
            timer?: Actor;
        }
    >;
}

export interface PlayersPoolStateSchema {
    states: {
        // Game is running - players can disconnect and reconnect in given time
        // period without causing any changes
        running: {};

        // Semi-transitional state to decide if game is still in terminating
        // mode or already ended
        if_terminating: {};

        // Game is being terminating. This state is a hold-out for players who
        // are disconnected when game ended, and we need to wait for them to
        // reconnect to inform them of the game outcome.
        terminating: {};

        // Game end. When this state is reached, the parent machine also
        // proceeds to its end
        end: {};
    };
}

export const players_pool_machine = Machine<
    PlayersPoolContext,
    PlayersPoolStateSchema,
    PlayersPoolEvent
>(
    {
        id: "players_connections",
        initial: "running",
        strict: true,

        context: {
            playerConnections: new Map()
        },
        states: {
            running: {
                // on: {
                //     SOC_START: { actions: "add_player" }
                // }
            },
            if_terminating: {
                entry: "remove_player",
                after: {
                    // use of 0-delay instead of "always" to force
                    // "remove_player" action before cond guard is executed
                    0: [
                        { cond: "no_players_left", target: "end" },
                        { target: "terminating" }
                    ]
                }
            },
            terminating: {},
            end: {
                type: "final"
            }
        },
        on: {
            SOC_DISCONNECT: { actions: "start_reconnection_timer" },
            SOC_RECONNECT: { actions: "abort_reconnection_timer" },
            PLAYER_DONE: "if_terminating",
            DISCONNECT_TIMEOUT: {
                target: "if_terminating",
                actions: "notify_parent_of_timeout"
            },
            SHUTDOWN: { target: "end", actions: "shutdown" }
        }
    },
    {
        actions: {
            start_reconnection_timer: assign((ctx, e) => {
                if (e.type !== "SOC_DISCONNECT") {
                    throw new UnexpectedEvent(e, "start_reconnection_timer");
                }
                const { player_id } = e;

                // disconnect during game in progress - don't drop the game, await
                actionlog("start_reconnection_timer", player_id);

                // start a reconnection timeout
                const cb_actor = reconnect_timer(
                    player_id,
                    DISCONNECT_FORFEIT_TIMEOUT
                );
                return {
                    playerConnections: ctx.playerConnections.set(player_id, {
                        timer: spawn(cb_actor)
                    })
                };
            }),
            abort_reconnection_timer: assign((ctx, e) => {
                if (e.type !== "SOC_RECONNECT") {
                    throw new UnexpectedEvent(e, "abort_reconnection_timer");
                }
                const { player_id } = e;

                actionlog("abort_reconnection_timer", player_id);

                // cancel reconnect timer
                const timer = ctx.playerConnections.get(player_id)?.timer;
                if (!timer) {
                    throw new Error("Trying to end timer, that doesn't exist");
                }
                timer.stop?.();

                return {
                    playerConnections: ctx.playerConnections.set(player_id, {})
                };
            }),
            remove_player: (ctx, e) => {
                if (
                    e.type !== "PLAYER_DONE" &&
                    e.type !== "DISCONNECT_TIMEOUT"
                ) {
                    throw new UnexpectedEvent(e, "remove_player");
                }

                const { player_id } = e;
                actionlog("remove_player", e.type, e.player_id);

                if (!ctx.playerConnections.has(player_id)) {
                    throw new Error(
                        `trying to remove missing player: ${player_id}`
                    );
                }

                // removing the finished player
                ctx.playerConnections.get(player_id)?.timer?.stop?.();
                ctx.playerConnections.delete(player_id);
            },
            notify_parent_of_timeout: pure((ctx, e) =>
                sendParent(<PlayerDisconnectTimeout>{
                    type: "DISCONNECT_TIMEOUT",
                    player_id: (e as PlayerDisconnectTimeout).player_id
                })
            ),
            shutdown: ctx => {
                actionlog("shutdown");
                for (const pcon of ctx.playerConnections.values()) {
                    pcon.timer?.stop?.();
                    pcon.timer = undefined;
                }
            }
        },
        guards: {
            no_players_left: ctx => {
                return ctx.playerConnections.size === 0;
            }
        }
    }
);
