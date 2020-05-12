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
                    ]
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
        }
    },
    {
        guards: {
            reconnected_our_turn: (_, e: S_ReconnectedEvent) => e.isMyTurn,
            started_with_our_turn: (_, e: S_GameStartEvent) =>
                e.role === "first",
            draw: (_, e: S_GameEndEvent) => e.outcome === "meh",
            victory: (_, e: S_GameEndEvent) => e.outcome === "win"
        },
        actions: {
            emit_iwannabetracer: (ctx, e: UI_RolePickedEvent) =>
                ctx.gameConnector.actions.emit_iwannabetracer(e.role),
            emit_move: (ctx, e: UI_MoveChosenEvent) =>
                ctx.gameConnector.actions.emit_move(e.row, e.column),
            store_connection: assign({
                gameConnector: (_, e: UI_NewGameEvent) => e.connection
            })
        }
    },
    {
        gameConnector: null
    }
);
