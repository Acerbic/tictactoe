/**
 * Implementation of game-room machine
 */
const statelog = require("debug")("ttt:ghost:state-machine");
const errorlog = require("debug")("ttt:ghost:error");
const debuglog = require("debug")("ttt:ghost:debug");

import { MachineConfig, MachineOptions } from "xstate";
import * as _MachineActions from "./actions";
const {
    pass_setup_player_connect,
    pass_setup_player_pick,
    ...MachineActions
} = _MachineActions;

import {
    GameRoomContext,
    GameRoomSchema,
    GameRoomEvent
} from "./game-room-schema";
import player_setup from "../player-setup/player-setup-machine";
import {
    CreateGameResponse,
    APIResponseFailure,
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
    initial: "setup",
    states: {
        setup: {
            type: "parallel",
            states: {
                player1: {
                    initial: "player_setup",
                    states: {
                        player_setup: {
                            invoke: {
                                id: "player1",
                                src: "player-setup-machine",
                                data: { parent_ctx: (ctx: any) => ctx },
                                onDone: "player_setup_done"
                            },
                            on: {
                                // passing down events to appopriate player-setup submachines
                                // this counts as self-transition for game-room machine
                                SOC_CONNECT: {
                                    actions: pass_setup_player_connect
                                },
                                SOC_IWANNABETRACER: {
                                    actions: pass_setup_player_pick
                                }
                            }
                        },
                        player_setup_done: { type: "final" }
                    }
                },
                player2: {
                    initial: "player_setup",
                    states: {
                        player_setup: {
                            invoke: {
                                id: "player2",
                                src: "player-setup-machine",
                                data: { parent_ctx: (ctx: any) => ctx },
                                onDone: "player_setup_done"
                            },
                            on: {
                                // passing down events to appopriate player-setup submachines
                                // this counts as self-transition for game-room machine
                                SOC_CONNECT: {
                                    actions: pass_setup_player_connect
                                },
                                SOC_IWANNABETRACER: {
                                    actions: pass_setup_player_pick
                                }
                            }
                        },
                        player_setup_done: { type: "final" }
                    }
                }
            },
            onDone: "role_requests_taken"
        },
        role_requests_taken: {
            on: {
                "": [
                    {
                        cond: "role_requests_conflict",
                        target: "role_requested_conflict",
                        actions: "emit_iamalreadytracer"
                    },
                    {
                        target: "roles_assigned",
                        actions: ["set_current_player", "emit_you_are_it"]
                    }
                ]
            }
        },
        role_requested_conflict: {
            onEntry: "cointoss_roles",
            on: {
                "": {
                    target: "roles_assigned",
                    actions: ["emit_you_are_it"]
                }
            }
        },
        roles_assigned: {
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
                    target: "game_move"
                }
            }
        },
        game_move: {
            invoke: {
                src: "invoke_make_move",
                onDone: {
                    target: "move_result",
                    actions: "emit_opponent_moved"
                }
            }
        },
        move_result: {
            on: {
                "": [
                    {
                        cond: (ctx: any) =>
                            ctx.latest_game_state.game == "wait",
                        target: "wait4move",
                        actions: ["switch_player", "emit_your_turn"]
                    },
                    {
                        cond: (ctx: any) =>
                            ctx.latest_game_state.game == "over" ||
                            ctx.latest_game_state.game == "draw",
                        target: "end",
                        actions: ["emit_gameover", "call_dropgame"]
                    }
                ]
            }
        },
        end: {
            type: "final"
        }
    }
};

export const machine_options: Partial<MachineOptions<
    GameRoomContext,
    GameRoomEvent
>> = {
    services: {
        "player-setup-machine": player_setup(),

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
        role_requests_conflict: (ctx, event) => {
            const it = ctx.players.values();
            const p1 = it.next().value;
            const p2 = it.next().value;

            return p1.role_request === p2.role_request;
        }
    }
};
