import {
    ClientSchema,
    ClientContext,
    ClientEvent,
    S_ReconnectedEvent,
    S_GameStartEvent,
    S_GameEndEvent,
    UI_NewGameEvent,
    UI_RolePickedEvent,
    UI_MoveChosenEvent
} from "./state-machine-schema";

import { Machine, assign } from "xstate";

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
                    UI_NEW_GAME: {
                        target: "awaiting_connection",
                        actions: "store_connection"
                    }
                }
            },
            awaiting_connection: {
                on: {
                    S_CONNECTED: "role_picking",
                    S_RECONNECTED: [
                        {
                            cond: "reconnected_our_turn",
                            target: "game.our_turn"
                        },
                        {
                            target: "game.their_turn"
                        }
                    ]
                }
            },
            role_picking: {
                on: {
                    // ROOM_DROPPED: "initial",
                    UI_ROLE_PICKED: {
                        target: "waiting4opponent",
                        actions: "emit_iwannabetracer"
                    }
                }
            },
            waiting4opponent: {
                on: {
                    // ROOM_DROPPED: "initial",
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
                                    S_NEXT_TURN: "#game-client.game.their_turn"
                                }
                            }
                        }
                    },
                    their_turn: {
                        on: {
                            S_NEXT_TURN: "our_turn"
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
                    UI_QUIT_GAME: { target: "initial", actions: "emit_imdone" }
                }
            },

            end: {
                states: {
                    draw: {},
                    victory: {},
                    defeat: {}
                },
                on: {
                    UI_NEW_GAME: {
                        target: "awaiting_connection",
                        actions: "store_connection"
                    }
                }
            }
        },
        on: {
            UI_RESET: {
                target: "initial",
                actions: "emit_dropgame"
            }
        }
    },
    {
        guards: {
            reconnected_our_turn: (_, e) =>
                e.type === "S_RECONNECTED" && e.isMyTurn,
            started_with_our_turn: (_, e) =>
                e.type === "S_GAME_START" && e.role === "first",
            draw: (_, e) => e.type === "S_GAME_END" && e.outcome === "meh",
            victory: (_, e) => e.type === "S_GAME_END" && e.outcome === "win"
        },
        actions: {
            emit_iwannabetracer: (ctx, e) =>
                e.type === "UI_ROLE_PICKED" &&
                ctx.gameConnector?.actions.emit_iwannabetracer(e.role),
            emit_move: (ctx, e) =>
                e.type === "UI_MOVE_CHOSEN" &&
                ctx.gameConnector?.actions.emit_move(e.row, e.column),
            emit_dropgame: ctx => {
                ctx.gameConnector?.actions.emit_dropgame();
                ctx.gameConnector = null;
            },
            store_connection: assign({
                gameConnector: (ctx, e: ClientEvent) =>
                    e.type === "UI_NEW_GAME" ? e.connection : ctx.gameConnector
            }),
            emit_imdone: ctx => {
                ctx.gameConnector?.actions.emit_imdone();
                ctx.gameConnector = null;
            }
        }
    },
    {
        gameConnector: null
    }
);
