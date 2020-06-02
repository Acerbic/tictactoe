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
import { API } from "@trulyacerbic/ttt-apis/ghost-api";

const GHOST_URL = process.env.game_host_url!;

export class SocketGameConnector implements GameConnector {
    setBoard: Function;
    setRoleAssigned: (r: string) => void;
    socket: SocketIOClient.Socket;
    send: ClientEventSender;
    playerId: string;

    constructor(
        setBoard: SocketGameConnector["setBoard"],
        setRoleAssigned: SocketGameConnector["setRoleAssigned"],
        send: ClientEventSender,
        playerId: string
    ) {
        this.setBoard = setBoard;
        this.setRoleAssigned = setRoleAssigned;
        this.send = send;
        this.playerId = playerId;
        this.socket = this.openSocket(playerId);
        this.socket.connect();
    }

    actions = {
        emit_iwannabetracer: (role: "first" | "second") => {
            this.socket.emit("iwannabetracer", role);
        },
        emit_move: (row: number, column: number) => {
            this.socket.emit("move", { row, column }, (accepted: boolean) => {
                if (!accepted) {
                    this.send({
                        type: "S_MOVE_REJECTED"
                    });
                }
            });
        },

        emit_dropgame: () => {
            this.socket.close();
        },

        emit_imdone: () => {
            this.socket.emit("imdone");
            this.socket.close();
        }
    };

    private openSocket(playerId: string): SocketIOClient.Socket {
        const socket = io(GHOST_URL, {
            timeout: 2000,
            reconnection: true,
            query: {
                playerId
            },
            autoConnect: false,
            reconnectionAttempts: 20
        });

        if (!socket) {
            throw "Failed to create a socket";
        } else {
            socket
                .on("connect", () => {
                    console.info("Socket -- connect");
                })
                .on("connect_error", (err: Error) => {
                    console.error("Socket -- connect_error", err);
                })
                .on("connect_timeout", (to: any) => {
                    console.debug("Socket -- connect_timeout", to);
                })
                .on("error", (err: Error) => {
                    console.error("Socket -- error", err);
                })
                .on("disconnect", (reason: string) => {
                    console.info("Socket -- disconnect", reason);
                })
                .on("reconnect", (num: number) => {
                    console.info("Socket -- reconnect", num);
                })
                .on("reconnect_attempt", (num: number) => {
                    console.info("Socket -- reconnect_attempt", num);
                })
                .on("reconnecting", (num: number) => {
                    console.info("Socket -- reconnecting", num);
                })
                .on("reconnect_failed", () => {
                    console.error("Socket -- reconnect_failed");
                })
                .on("ping", () => {
                    console.debug("Socket -- ping");
                })
                .on("pong", (latency: number) => {
                    console.debug("Socket -- pong", latency);
                });

            this.attachListeners(socket);
            return socket;
        }
    }

    /**
     * Listens on the socket and raises events for xstate machine / react state update
     */
    private attachListeners = (socket: SocketIOClient.Socket) => {
        // this one will be received if we are joining a new game
        socket.once("choose_role", this.s_choose_role);
        // this one will be received (instead of "choose_role") if we
        // are reconnecting to a match in progress
        // socket.once("update", this.s_reconnection);

        socket.on("update", this.s_update);

        // those to follow "choose_role" in player configuration process
        socket.once("iamalreadytracer", this.s_iamalreadytracer);
        socket.once("you_are_it", this.s_you_are_it);

        // those messages are received as part of the game proceedings
        // socket.on("your_turn", this.s_your_turn);
        // socket.on("meme_accepted", this.s_move_accepted);
        // socket.on("opponent_moved", this.s_opponent_moved);
        socket.on("gameover", this.s_gameover);
    };

    private s_choose_role = () => {
        this.send({
            type: "S_CONNECTED"
        });
    };

    // reconnect to an existing game
    private s_reconnection = (r: API["out"]["update"]) => {
        this.setBoard(r.board);
        this.send({
            type: "S_RECONNECTED",
            isMyTurn: r.game_state.turn === this.playerId
        });
    };

    // received 'choose_role' message
    private s_you_are_it = ({ role }: API["out"]["you_are_it"]) => {
        console.log("I am " + role);
        this.setRoleAssigned(role);
        this.send({ type: "S_GAME_START", role });
    };

    private s_iamalreadytracer = () => {
        console.log("Role will be assigned by coin toss...");
    };

    private s_update = (data: API["out"]["update"]) => {
        this.setBoard(data.board);
        this.send({
            type:
                data.game_state.turn === this.playerId
                    ? "S_OUR_TURN"
                    : "S_THEIR_TURN"
        });
    };

    // private s_your_turn = () => {
    //     console.log("its my turn!");
    // };

    // point of this if we use ack to determine validity of move submitted?
    // private s_move_accepted = (response: API["out"]["meme_accepted"]) => {
    //     this.send({ type: "S_MOVE_ACCEPTED" });
    //     this.setBoard(response.board);
    // };

    // private s_opponent_moved = (response: API["out"]["opponent_moved"]) => {
    //     this.send({ type: "S_NEXT_TURN" });
    //     this.setBoard(response.board);
    // };

    private s_gameover = (response: API["out"]["gameover"]) => {
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
