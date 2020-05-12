import {
    ClientSchema,
    ClientContext,
    ClientEvent,
    ReconnectedEvent,
    GameStartEvent,
    GameEndEvent,
    NewGameEvent,
    RolePickedEvent,
    MoveChosenEvent
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
                    NEW_GAME: {
                        target: "awaiting_connection",
                        actions: "store_connection"
                    }
                }
            },
            awaiting_connection: {
                on: {
                    CONNECTED: "role_picking",
                    RECONNECTED: [
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
                    ROOM_DROPPED: "initial",
                    ROLE_PICKED: {
                        target: "waiting4opponent",
                        actions: "emit_iwannabetracer"
                    }
                }
            },
            waiting4opponent: {
                on: {
                    ROOM_DROPPED: "initial",
                    GAME_START: [
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
                                    MOVE_CHOSEN: {
                                        target: "moved",
                                        actions: "emit_move"
                                    }
                                }
                            },
                            moved: {
                                on: {
                                    NEXT_TURN: "their_turn"
                                }
                            }
                        }
                    },
                    their_turn: {
                        on: {
                            NEXT_TURN: "our_turn"
                        }
                    }
                },
                on: {
                    GAME_END: [
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
                    NEW_GAME: {
                        target: "awaiting_connection",
                        actions: "store_connection"
                    }
                }
            }
        }
    },
    {
        guards: {
            reconnected_our_turn: (_, e: ReconnectedEvent) => e.isMyTurn,
            started_with_our_turn: (_, e: GameStartEvent) => e.role === "first",
            draw: (_, e: GameEndEvent) => e.outcome === "meh",
            victory: (_, e: GameEndEvent) => e.outcome === "win"
        },
        actions: {
            emit_iwannabetracer: (ctx, e: RolePickedEvent) =>
                ctx.gameConnector.actions.emit_iwannabetracer(e.role),
            emit_move: (ctx, e: MoveChosenEvent) =>
                ctx.gameConnector.actions.emit_move(e.row, e.column),
            store_connection: assign({
                gameConnector: (_, e: NewGameEvent) => e.connection
            })
        }
    },
    {
        gameConnector: null
    }
);
