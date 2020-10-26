/**
 * Implementation of game-room machine
 */

import { statelog, hostlog, errorlog, debuglog } from "../../utils";

import {
    MachineConfig,
    MachineOptions,
    ActionFunctionMap,
    DoneInvokeEvent
} from "xstate";
import { forwardTo } from "xstate/lib/actions";

import * as MachineActions from "./actions";

import {
    GameRoomContext,
    GameRoomSchema,
    GameRoomEvent,
    GameRoom_PlayerMove,
    GameRoom_Shutdown,
    GameRoom_PlayerQuit
} from "./game-room-schema";
import {
    CreateGameResponse,
    MakeMoveResponse,
    CreateGameRequest,
    MakeMoveRequest,
    ErrorCodes
} from "@trulyacerbic/ttt-apis/gmaster-api";
import { GMasterError } from "../../connectors/gmaster_connector";

import {
    players_pool_machine,
    PlayersPoolContext,
    PlayersPool_PlayerDone
} from "../players-pool/players-pool-machine";
import { send_to_ppool } from "../../utils";

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
                SOC_START: { actions: "initiate_player_setup" },
                SOC_PLAYER_DROP_ROOM: { actions: ["clear_player_setup"] },
                SOC_DISCONNECT: {
                    actions: ["clear_player_setup"]
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
                0: {
                    target: "game_in_progress",
                    actions: ["finalize_setup"]
                }
            }
        },
        game_in_progress: {
            type: "parallel",
            states: {
                game: {
                    initial: "creating_game",
                    states: {
                        creating_game: {
                            invoke: {
                                src: "invoke_create_game",
                                onDone: {
                                    target: "wait4move",
                                    actions: ["emit_game_started"]
                                },
                                onError: {
                                    target: "end",
                                    actions: ["emit_server_error_fatal"]
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
                                        cond: "move_ended_game",
                                        target: "end",
                                        actions: [
                                            "emit_update_both",
                                            "emit_gameover" /* possible racing with emit_update_both */,
                                            "call_dropgame",
                                            "remove_done_players",
                                            "store_winner"
                                        ]
                                    },
                                    {
                                        target: "wait4move",
                                        actions: ["emit_update_both"]
                                    }
                                ],
                                onError: [
                                    {
                                        cond: (_, e) =>
                                            typeof e.data.rejectReason ===
                                                "object" &&
                                            e.data.rejectReason instanceof
                                                GMasterError &&
                                            e.data.rejectReason.code ===
                                                ErrorCodes.ILLEGAL_MOVE,
                                        target: "wait4move",
                                        actions: "ack_invalid_move"
                                    },
                                    {
                                        target: "end",
                                        actions: "emit_server_error_fatal"
                                    }
                                ]
                            }
                        },
                        end: {
                            type: "final"
                        }
                    },
                    on: {
                        DISCONNECT_TIMEOUT: {
                            target: "game.end",
                            actions: [
                                "store_winner_forfeit",
                                "emit_gameover_timeout",
                                "remove_done_players"
                            ]
                        }
                    }
                },
                connections: {
                    invoke: {
                        id: "player_pool",
                        src: players_pool_machine,
                        data: ctx =>
                            <PlayersPoolContext>{
                                playerConnections: new Map()
                                    .set(ctx.player1!, {})
                                    .set(ctx.player2!, {})
                            },
                        onDone: {
                            target: "#ghost.end"
                        }
                    }
                }
            }
        },
        end: {
            entry: [
                "shutdown_ongoing_activities"
                // send_to_ppool(<GameRoom_Shutdown>{ type: "SHUTDOWN" })
            ],
            type: "final"
        }
    },
    on: {
        // might be overtaken by deeper (more specific) states transitions
        SOC_RECONNECT: [
            {
                cond: "game_already_ended",
                actions: [
                    "emit_gameover_final",
                    send_to_ppool(
                        (_, event) =>
                            <PlayersPool_PlayerDone>{
                                type: "PLAYER_DONE",
                                player_id: (event as GameRoom_PlayerQuit)
                                    .player_id
                            }
                    )
                ]
            },
            {
                actions: ["top_reconnect", forwardTo("player_pool")]
            }
        ],
        SOC_DISCONNECT: {
            actions: forwardTo("player_pool")
        },
        SOC_PLAYER_QUIT: {
            target: [
                "game_in_progress.game.end",
                ".game_in_progress.connections"
            ],
            actions: [
                "emit_gameover",
                "call_dropgame",
                "store_winner_forfeit",
                "remove_done_players"
            ]
        },
        "error.platform.top_reconnect": "end",
        "error.platform.emit_update_both": "end",
        SHUTDOWN: {
            target: "end"
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
            return ctx.gm_connect
                .post<CreateGameRequest, CreateGameResponse>("CreateGame", {
                    player1Id: ctx.player1!,
                    player2Id: ctx.player2!
                })
                .then(response => {
                    ctx.game_id = response.gameId!;
                    return response;
                })
                .catch(reason => {
                    // This is a fetch-level error
                    errorlog("Error during /CreateGame: ", reason);

                    // will be processed in onError event handlers by xstate
                    throw reason;
                });
        },

        /**
         * Call MakeMove on game master.
         */
        invoke_make_move: (ctx, e) => {
            const event = e as GameRoom_PlayerMove;
            return ctx.gm_connect
                .post<MakeMoveRequest, MakeMoveResponse>(
                    "MakeMove",
                    {
                        playerId: event.player_id,
                        move: event.move
                    },
                    ctx.game_id
                )
                .then(response => {
                    event.ack?.(true);
                    return response;
                })
                .catch(reason => {
                    errorlog("Error during calling /MakeMove: %o", reason);
                    throw {
                        srcEvent: event,
                        rejectReason: reason
                    };
                });
        }
    },

    actions: {
        // casting it here allows for more flexible approach with definitions in actions.ts
        ...((MachineActions as unknown) as ActionFunctionMap<
            GameRoomContext,
            GameRoomEvent
        >)
    },

    guards: {
        both_players_ready: ({ players }, event) => {
            debuglog("Guard: both_players_ready", players.size);
            // ATTN: cond guard is checked BEFORE actions are executed
            return (
                players.size >= 2 &&
                event.type === "PLAYER_READY" &&
                Array.from(players.values()).filter(pinfo =>
                    pinfo.setup_actor.state!.matches("ready2play")
                ).length == 2
            );
        },
        game_already_ended: (_, event, { state }) => {
            debuglog("test game already ended", state.value);
            if (event.type !== "SOC_RECONNECT") {
                throw new Error("Mismatched Action");
            }

            return state.matches("game_in_progress.game.end");
        },
        move_ended_game: (_, event) => {
            const game = (event as DoneInvokeEvent<MakeMoveResponse>).data
                .newState.game;
            return game === "over" || game === "draw";
        }
    }
};
