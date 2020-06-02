/**
 * Implementation of game-room machine
 */

import { statelog, hostlog, errorlog, debuglog } from "../../utils";

import { MachineConfig, MachineOptions, ActionFunctionMap } from "xstate";
import * as MachineActions from "./actions";

import {
    GameRoomContext,
    GameRoomSchema,
    GameRoomEvent,
    GameRoom_PlayerMove
} from "./game-room-schema";
import {
    CreateGameResponse,
    MakeMoveResponse,
    CreateGameRequest,
    MakeMoveRequest,
    ErrorCodes
} from "@trulyacerbic/ttt-apis/gmaster-api";
import { GMasterError } from "../../connectors/gmaster_connector";

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
                SOC_CONNECT: { actions: "initiate_player_setup" },
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
                    actions: ["emit_your_turn"]
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
                        cond: ctx => ctx.latest_game_state!.game == "wait",
                        target: "wait4move",
                        actions: [
                            "emit_update_both",
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
                            "emit_update_both",
                            "emit_gameover",
                            "call_dropgame"
                        ]
                    }
                ],
                onError: [
                    {
                        cond: (ctx, e) =>
                            typeof e.data.rejectReason === "object" &&
                            e.data.rejectReason instanceof GMasterError &&
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
        // might be overtaken by deeper (more specific) states transitions
        SOC_CONNECT: { actions: "top_reconnect" },
        SOC_DISCONNECT: {
            actions: "top_disconnect"
        },
        SOC_PLAYER_QUIT: {
            target: "end",
            actions: ["emit_gameover", "call_dropgame"]
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
            if (ctx.current_player === ctx.player2) {
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
                        // This is a GMaster internally produced error.
                        throw new GMasterError(response);
                    }
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
                    if (response.success) {
                        ctx.latest_game_state = response.newState;
                        event.ack?.(true);
                        return response;
                    } else {
                        throw new GMasterError(response);
                    }
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
        }
    }
};
