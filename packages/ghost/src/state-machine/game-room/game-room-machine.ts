/**
 * Implementation of game-room machine
 */
const statelog = require("debug")("ttt:ghost:state-machine");
const errorlog = require("debug")("ttt:ghost:error");
const debuglog = require("debug")("ttt:ghost:debug");

import { MachineConfig, MachineOptions, ActionFunctionMap } from "xstate";
import * as MachineActions from "./actions";

import {
    GameRoomContext,
    GameRoomSchema,
    GameRoomEvent
} from "./game-room-schema";
import {
    CreateGameResponse,
    MakeMoveResponse,
    CreateGameRequest,
    MakeMoveRequest
} from "../../connectors/gmaster_api";
import { log } from "xstate/lib/actions";

export const state_machine: MachineConfig<
    GameRoomContext,
    GameRoomSchema,
    GameRoomEvent
> = {
    id: "ghost",
    initial: "players_setup",
    states: {
        players_setup: {
            on: {
                SOC_CONNECT: { actions: "spawn_player_setup_actor" },
                SOC_DISCONNECT: {
                    actions: ["forward_soc_event", "clear_player_setup"]
                },
                SOC_IWANNABETRACER: { actions: "forward_soc_event" },
                PLAYER_READY: [
                    {
                        cond: "both_players_ready",
                        target: "roles_setup",
                        actions: "add_ready_player"
                    },
                    { actions: "add_ready_player" }
                ]
            }
        },
        roles_setup: {
            after: {
                // zero-delay instead of transient transition to enforce actions stack execution
                // unfortunately this creates a miniscule "uncertainty" period, in which
                // socket disconnect/connect events could be lost or misinterpreted
                0: {
                    target: "creating_game",
                    actions: ["finalize_setup"]
                }
            }
        },
        creating_game: {
            onEntry: "emit_you_are_it",
            invoke: {
                src: "invoke_create_game",
                onDone: {
                    target: "wait4move",
                    actions: "emit_your_turn"
                }
            }
        },
        wait4move: {
            on: {
                SOC_MOVE: {
                    target: "making_move"
                }
            }
        },
        making_move: {
            invoke: {
                src: "invoke_make_move",
                onDone: [
                    {
                        cond: ctx => ctx.latest_game_state!.game == "wait",
                        target: "wait4move",
                        actions: [
                            "emit_opponent_moved",
                            "switch_player",
                            "emit_your_turn"
                        ]
                    },
                    {
                        cond: ctx =>
                            ctx.latest_game_state!.game == "over" ||
                            ctx.latest_game_state!.game == "draw",
                        target: "end",
                        actions: [
                            "emit_opponent_moved",
                            "emit_gameover",
                            "call_dropgame"
                        ]
                    }
                ]
            }
        },
        end: {
            type: "final"
        }
    },
    on: {
        // might be overtaken by deeper (more specific) states transitions
        SOC_CONNECT: { actions: [log("Top-state connect"), "top_reconnect"] },
        SOC_DISCONNECT: {
            actions: [log("Top-state disconnect"), "top_disconnect"]
        }
    }
};

export const machine_options: Partial<MachineOptions<
    GameRoomContext,
    GameRoomEvent
>> = {
    services: {
        /**
         * call CreateGame Rest API on game master
         */
        invoke_create_game: ctx => {
            if (ctx.current_player == ctx.player2) {
                [ctx.player1, ctx.player2] = [ctx.player2, ctx.player1];
            }

            return ctx.gm_connect
                .post<CreateGameRequest, CreateGameResponse>("CreateGame", {
                    player1Id: ctx.player1!,
                    player2Id: ctx.player2!
                })
                .then(response => {
                    if (response.success) {
                        ctx.latest_game_state = {
                            turn: "player1",
                            game: "wait"
                        };
                        ctx.game_id = response.gameId!;
                        return response;
                    } else {
                        debuglog("Creating a game returned error", response);
                        throw response;
                    }
                })
                .catch(reason => {
                    debuglog("Creating a game failed: ", reason);
                    throw reason;
                });
        },

        /**
         * Call MakeMove on game master.
         */
        invoke_make_move: (ctx, event) => {
            return ctx.gm_connect
                .post<MakeMoveRequest, MakeMoveResponse>(
                    "MakeMove",
                    {
                        playerId: ctx.current_player!,
                        move: {
                            row: event.move.row,
                            column: event.move.column
                        }
                    },
                    ctx.game_id
                )
                .then(response => {
                    if (response.success) {
                        ctx.latest_game_state = response.newState;
                        return { type: "CALL_MAKEMOVE_ENDED", response };
                    } else {
                        errorlog(
                            `Call to MakeMove failed: [${response.errorCode}] - ${response.errorMessage}`
                        );
                        throw response;
                        // TODO: handle non-success by the game master
                    }
                })
                .catch((ex: any) => {
                    errorlog("Exceptional thing happened: %o", ex);
                });
        }
    },

    actions: {
        // casting it here allows for more flexible approach with definitions in actions.ts
        ...(MachineActions as ActionFunctionMap<GameRoomContext, GameRoomEvent>)
    },

    guards: {
        both_players_ready: ({ players }, event) => {
            // ATTN: cond guard is checked BEFORE actions are executed
            return players.size >= 1 && event.type === "PLAYER_READY";
        }
    }
};
