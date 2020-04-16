/**
 * Implementation of game-room machine
 */
const statelog = require("debug")("ttt:ghost:state-machine");
const errorlog = require("debug")("ttt:ghost:error");
const debuglog = require("debug")("ttt:ghost:debug");

import { MachineConfig, MachineOptions, send, forwardTo } from "xstate";
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

export const state_machine: MachineConfig<
    GameRoomContext,
    GameRoomSchema,
    GameRoomEvent
> = {
    id: "ghost",
    type: "parallel",
    states: {
        players: {
            initial: "boot",
            states: {
                // this is an initializer for spawned actor machines (since must)
                // execute spawning inside `assign` action
                boot: {
                    on: {
                        "": {
                            target: "setup",
                            actions: "spawn_player_setup_machines"
                        }
                    }
                },
                setup: {
                    on: {
                        SOC_CONNECT: { actions: "forward_soc_event" },
                        SOC_DISCONNECT: { actions: "forward_soc_event" },
                        SOC_IWANNABETRACER: { actions: "forward_soc_event" },
                        PLAYER_READY: "player_ready",
                        PLAYER_DROPPED: { actions: "remove_player_info" }
                    }
                },
                player_ready: {
                    onEntry: "store_player_info",
                    on: {
                        "": [
                            {
                                cond: "both_players_ready",
                                target: "game_in_progress"
                            },
                            {
                                target: "setup"
                            }
                        ]
                    }
                },
                game_in_progress: {
                    onEntry: send("START_THE_GAME"),
                    on: {
                        SOC_CONNECT: {},
                        SOC_DISCONNECT: {}
                        // MATCH_FINISHED: {}
                    }
                },
                end: {
                    type: "final"
                }
            }
        },
        game: {
            initial: "setup",
            states: {
                setup: {
                    on: {
                        START_THE_GAME: {
                            target: "role_requests_taken",
                            actions: "__assign_ctx_players"
                        }
                    }
                },
                role_requests_taken: {
                    on: {
                        "": [
                            {
                                cond: "role_requests_conflict",
                                target: "creating_game",
                                actions: [
                                    "emit_iamalreadytracer",
                                    "cointoss_roles"
                                ]
                            },
                            {
                                target: "creating_game",
                                actions: ["set_current_player"]
                            }
                        ]
                    },
                    onExit: "emit_you_are_it"
                },
                creating_game: {
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
                                cond: ctx =>
                                    ctx.latest_game_state!.game == "wait",
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
            }
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
                        throw response;
                    }
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
        ...MachineActions
    },

    guards: {
        both_players_ready: ({ players }) => {
            // cond guard is checked BEFORE actions executed, so onEntry action is not taken yet
            // (its because the guarded event transition transient - "")
            return players.size >= 1;
        },

        role_requests_conflict: ctx => {
            const [p1, p2] = ctx.players.values();
            return p1.role_request === p2.role_request;
        }
    }
};
