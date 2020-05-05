import {
    ClientSchema,
    ClientContext,
    ClientEvent,
    ReconnectedEvent,
    GameStartEvent,
    GameEndEvent
} from "./state-machine-schema";
import { Machine } from "xstate";

export const clientMachine = Machine<ClientContext, ClientSchema, ClientEvent>(
    {
        id: "game-client",
        initial: "initial",
        states: {
            initial: {
                on: {
                    CONNECTION_INITIATED: "awaiting_connection"
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
                    ROLE_PICKED: "waiting4opponent"
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
                        on: {
                            NEXT_TURN: "their_turn"
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
                    NEW_GAME: "awaiting_connection"
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
        }
    },
    {}
);
