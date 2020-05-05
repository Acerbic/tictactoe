import {
    ClientSchema,
    ClientContext,
    ClientEvent,
    ReconnectedEvent,
    GameStartEvent,
    GameEndEvent
} from "./state-machine-schema";
import { attachListeners } from "./socket_handlers";

import { Machine, Interpreter, assign } from "xstate";
import io from "socket.io-client";

export const clientMachine = Machine<ClientContext, ClientSchema, ClientEvent>(
    {
        id: "game-client",
        initial: "initial",
        states: {
            initial: {
                on: {
                    CONNECTION_INITIATED: {
                        target: "awaiting_connection",
                        actions: assign({ socket: (ctx, e) => e.socket })
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
                        actions: [
                            (ctx, e) =>
                                ctx.socket.emit("iwannabetracer", e.role)
                        ]
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
                    NEW_GAME: {
                        target: "awaiting_connection",
                        actions: assign({ socket: (ctx, e) => e.socket })
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
        }
    },
    {
        socket: null
    }
);

/**
 * While raising specific xstate events, this class opens a websocket and
 * configures it to listen and raise xstate events as a result of socket messages.
 */
export class SocketedInterpreter extends Interpreter<
    ClientContext,
    ClientSchema,
    ClientEvent
> {
    game_host_uri: string;
    setBoard: Function;

    constructor(game_host_uri: string, setBoard: Function) {
        super(clientMachine);
        this.game_host_uri = game_host_uri;
        this.setBoard = setBoard;
    }

    private reopenSocket(playerId: string): SocketIOClient.Socket {
        if (this.state.context.socket !== null) {
            this.state.context.socket.close();
        }
        console.log("Opening socket");
        const socket = io(this.game_host_uri, {
            timeout: 20000000,
            reconnection: false,
            query: {
                playerId
            }
        });
        if (!socket) {
            console.error("Failed to open a socket");
            throw "Failed to open a socket";
        } else {
            console.log("Opened socket");

            attachListeners(socket, this.send, playerId, this.setBoard as any);
            return socket;
        }
    }

    raise_player_connect(playerId: string) {
        this.send({
            type: "CONNECTION_INITIATED",
            socket: this.reopenSocket(playerId)
        });
    }

    raise_new_game(playerId: string) {
        this.send({
            type: "NEW_GAME",
            socket: this.reopenSocket(playerId)
        });
    }
}
