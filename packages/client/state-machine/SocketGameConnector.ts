/**
 * Class implements communication between Game Client xstate machine and remote
 * game server by opening and listening to a socket.
 *
 * By accepting `setBoard` and `send` arguments, instances of this class can
 * update React state (with setBoard) and xstate (with sending events) machine
 * state. Functions in `actions` property object emit messages towards remote
 * game server and incoming messages on the socket are transformed into
 * `setBoard` and/or `send` invokations.
 */

import io from "socket.io-client";
import { GameConnector, ClientEventSender } from "./state-machine-schema";

export class SocketGameConnector implements GameConnector {
    game_host_url: string;
    setBoard: Function;
    socket: SocketIOClient.Socket = null;
    send: ClientEventSender;
    playerId: string;

    constructor(
        game_host_url: string,
        setBoard: Function,
        send: ClientEventSender,
        playerId: string
    ) {
        this.game_host_url = game_host_url;
        this.setBoard = setBoard;
        this.send = send;
        this.playerId = playerId;
        this.openSocket(playerId);
    }

    actions = {
        emit_iwannabetracer: role => {
            this.socket.emit("iwannabetracer", role);
        },
        emit_move: (row: number, column: number) => {
            this.socket.emit("move", { row, column });
        },

        emit_dropgame: () => {
            this.socket.close();
        }
    };

    private openSocket(playerId: string) {
        this.socket = io(this.game_host_url, {
            timeout: 2000,
            reconnection: true,
            query: {
                playerId
            },
            autoConnect: false,
            reconnectionAttempts: 20
        });

        if (!this.socket) {
            throw "Failed to create a socket";
        } else {
            this.socket
                .on("connect", () => {
                    console.info("Socket -- connect");
                })
                .on("connect_error", err => {
                    console.error("Socket -- connect_error", err);
                })
                .on("connect_timeout", to => {
                    console.debug("Socket -- connect_timeout", to);
                })
                .on("error", err => {
                    console.error("Socket -- error", err);
                })
                .on("disconnect", reason => {
                    console.info("Socket -- disconnect", reason);
                })
                .on("reconnect", num => {
                    console.info("Socket -- reconnect", num);
                })
                .on("reconnect_attempt", num => {
                    console.info("Socket -- reconnect_attempt", num);
                })
                .on("reconnecting", num => {
                    console.info("Socket -- reconnecting", num);
                })
                .on("reconnect_failed", () => {
                    console.error("Socket -- reconnect_failed");
                })
                .on("ping", () => {
                    console.debug("Socket -- ping");
                })
                .on("pong", latency => {
                    console.debug("Socket -- pong", latency);
                });

            this.attachListeners();
            this.socket.connect();
        }
    }

    /**
     * Listens on the socket and raises events for xstate machine / react state update
     */
    private attachListeners = () => {
        // this one will be received if we are joining a new game
        this.socket.once("choose_role", () => this.s_choose_role());
        // this one will be received (instead of "choose_role") if we
        // are reconnecting to a match in progress
        this.socket.once("update", r => this.s_reconnection(r));

        // those to follow "choose_role" in player configuration process
        this.socket.once("iamalreadytracer", () => this.s_iamalreadytracer());
        this.socket.once("you_are_it", r => this.s_you_are_it(r));

        // those messages are received as part of the game proceedings
        this.socket.on("your_turn", () => this.s_your_turn());
        this.socket.on("meme_accepted", r => this.s_move_accepted(r));
        this.socket.on("opponent_moved", r => this.s_opponent_moved(r));
        this.socket.on("gameover", r => this.s_gameover(r));
    };

    private s_choose_role = () => {
        this.send({
            type: "S_CONNECTED"
        });
    };

    // reconnect to an existing game
    private s_reconnection = r => {
        this.setBoard(r.board);
        this.send({
            type: "S_RECONNECTED",
            isMyTurn: r.step === "my-turn"
        });
    };

    // received 'choose_role' message
    private s_you_are_it = ({ role }: { role: "first" | "second" }) => {
        console.log("I am " + role);
        this.send({ type: "S_GAME_START", role });
    };

    private s_iamalreadytracer = () => {
        console.log("Role will be assigned by coin toss...");
    };

    private s_your_turn = () => {
        console.log("its my turn!");
    };

    private s_move_accepted = response => {
        this.send({ type: "S_NEXT_TURN" });
        this.setBoard(response.board);
    };

    private s_opponent_moved = response => {
        this.send({ type: "S_NEXT_TURN" });
        this.setBoard(response.board);
    };

    private s_gameover = response => {
        this.send({
            type: "S_GAME_END",
            outcome: response.winner
                ? response.winner == this.playerId
                    ? "win"
                    : "fail"
                : "meh"
        });
    };
}
