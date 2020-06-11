/**
 * Implementation of the state machine schema for client app
 */

import { Machine, assign } from "xstate";
import {
    ClientSchema,
    ClientContext,
    ClientEvent
} from "./state-machine-schema";

/**
 * Implementation of machine governing game client operations
 */
export const clientMachine = Machine<ClientContext, ClientSchema, ClientEvent>(
    {
        id: "game-client",
        initial: "initial",
        states: {
            initial: {
                on: {
                    UI_CONNECT: {
                        target: "lobby",
                        actions: "store_connector"
                    }
                }
            },
            lobby: {
                on: {
                    S_RECONNECTED: "game.reconnecting",
                    UI_NEW_GAME: {
                        actions: "emit_start_game"
                    },
                    S_CHOOSE_ROLE: "role_picking"
                }
            },
            role_picking: {
                on: {
                    UI_ROLE_PICKED: {
                        target: "waiting4opponent",
                        actions: "emit_iwannabetracer"
                    }
                }
            },
            waiting4opponent: {
                on: {
                    S_GAME_START: [
                        {
                            cond: "started_with_our_turn",
                            target: "game.our_turn"
                        },
                        { target: "game.their_turn" }
                    ]
                }
            },
            game: {
                states: {
                    reconnecting: {
                        on: {
                            S_OUR_TURN: "our_turn",
                            S_THEIR_TURN: "their_turn"
                        }
                    },
                    our_turn: {
                        initial: "thinking",
                        states: {
                            thinking: {
                                on: {
                                    UI_MOVE_CHOSEN: {
                                        target: "moved",
                                        actions: "emit_move"
                                    }
                                }
                            },
                            moved: {
                                on: {
                                    S_THEIR_TURN:
                                        "#game-client.game.their_turn",
                                    S_MOVE_REJECTED: {
                                        target: "thinking",
                                        actions: [
                                            /* Show err message? */
                                        ]
                                    }
                                }
                            }
                        }
                    },
                    their_turn: {
                        on: {
                            S_OUR_TURN: "our_turn"
                        }
                    }
                },
                on: {
                    S_GAME_END: [
                        { cond: "draw", target: "end.draw" },
                        {
                            cond: "victory",
                            target: "end.victory"
                        },
                        { target: "end.defeat" }
                    ],
                    UI_QUIT_GAME: { target: "lobby", actions: "emit_im_done" }
                }
            },

            end: {
                states: {
                    draw: {},
                    victory: {},
                    defeat: {}
                },
                on: {
                    UI_BACK_TO_LOBBY: {
                        target: "lobby"
                    }
                }
            }
        },
        on: {
            UI_RESET: {
                target: "lobby",
                actions: "emit_drop_room"
            }
        }
    },
    {
        guards: {
            started_with_our_turn: (_, e) =>
                e.type === "S_GAME_START" && e.role === "first",
            draw: (_, e) => e.type === "S_GAME_END" && e.outcome === "meh",
            victory: (_, e) => e.type === "S_GAME_END" && e.outcome === "win"
        },
        actions: {
            store_connector: assign({
                gameConnector: (ctx, e: ClientEvent) =>
                    e.type === "UI_CONNECT" ? e.connector : ctx.gameConnector
            }),
            emit_start_game: (ctx, e) => {
                e.type === "UI_NEW_GAME" &&
                    ctx.gameConnector?.actions.emit_start_game(e.roomId);
            },
            emit_iwannabetracer: (ctx, e) =>
                e.type === "UI_ROLE_PICKED" &&
                ctx.gameConnector?.actions.emit_iwannabetracer(e.role),
            emit_move: (ctx, e) =>
                e.type === "UI_MOVE_CHOSEN" &&
                ctx.gameConnector?.actions.emit_move(e.row, e.column),
            emit_drop_room: ctx => {
                ctx.gameConnector?.actions.emit_drop_room();
            },
            emit_im_done: ctx => {
                ctx.gameConnector?.actions.emit_im_done();
            }
        }
    },
    {
        gameConnector: null
    }
);
