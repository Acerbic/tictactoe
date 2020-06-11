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
import decode from "jwt-decode";

import {
    API,
    Role,
    JWTSession,
    RoomId
} from "@trulyacerbic/ttt-apis/ghost-api";
import { GameConnector, ClientEventSender } from "./state-machine-schema";
import { PlayerAuthState } from "../state-defs";

const GHOST_URL = process.env.game_host_url!;

export class SocketGameConnector implements GameConnector {
    private socket: SocketIOClient.Socket;
    private playerId?: string;

    constructor(
        private setBoard: Function,
        private setRoleAssigned: (role: Role) => void,
        private setAuthTokenReceived: (token: string) => void,
        private send: ClientEventSender,
        player: PlayerAuthState
    ) {
        this.socket = this.openSocket(player);
        this.socket.connect();
    }

    actions = {
        emit_start_game: (roomId?: RoomId) => {
            this.socket.emit("start_game", (roomId && { roomId }) || undefined);
        },
        emit_iwannabetracer: (role: Role) => {
            this.socket.emit("iwannabetracer", role);
        },
        emit_move: (row: number, column: number) => {
            this.socket.emit("move", { row, column }, (accepted: boolean) => {
                if (!accepted) {
                    // "Roses are red\nViolets are blue\nYour move was bad\nAnd so are you."
                    this.send({
                        type: "S_MOVE_REJECTED",
                        move: { row, column }
                    });
                }
            });
        },
        emit_drop_room: () => {
            this.socket.emit("drop_room");
        },
        emit_im_done: () => {
            this.socket.emit("im_done");
        }
    };

    private openSocket(player: PlayerAuthState): SocketIOClient.Socket {
        const query: API["connection"] = Object.assign(
            {},
            { playerName: player.name },
            player.token ? { token: player.token } : undefined
        );
        const socket = io(GHOST_URL, {
            timeout: 2000,
            reconnection: true,
            query,
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
        socket.once("connection_ack", this.s_connection_ack);

        // game setup negotiation
        // this one will be received if we are joining a new game
        socket.on("choose_role", this.s_choose_role);

        // this will be sent as a conclusion of game setup, indicating the
        // actual game start
        socket.on("game_started", this.s_game_started);

        // downflow of the game situation from the source of truth, also this
        // will be received (instead of "choose_role") if we are reconnecting to
        // a match in progress. As part of the game, this will inform about turns
        // progression as well as board changes
        socket.on("update", this.s_update);

        // termination
        socket.on("gameover", this.s_gameover);

        // socket.on("ragequit", ...);
        // socket.on("server_error", ...);
    };

    /**
     * This might potentially throw if decoding fails
     */
    private s_connection_ack = ({
        token,
        isInGame
    }: API["out"]["connection_ack"]) => {
        console.debug("SOCKET: got s_connection_ack");
        const authData = decode(token) as JWTSession;
        this.playerId = authData.playerId;
        this.setAuthTokenReceived(token);

        if (isInGame) {
            this.send({ type: "S_RECONNECTED" });
        }
    };

    private s_choose_role = () => {
        console.debug("SOCKET: got s_choose_role");
        this.send({
            type: "S_CHOOSE_ROLE"
        });
    };

    private s_game_started = ({ role }: API["out"]["game_started"]) => {
        console.debug("SOCKET: got s_game_started");
        console.log("I am " + role);
        this.setRoleAssigned(role);
        this.send({ type: "S_GAME_START", role });
    };

    private s_update = (data: API["out"]["update"]) => {
        console.debug("SOCKET: got s_update");

        // FIXME: since update is moonlighting for reconnect event:
        this.setRoleAssigned(
            data.player1 === this.playerId ? "first" : "second"
        );

        this.setBoard(data.board);
        this.send({
            type:
                // its a bit convoluted way to determine who is "data.turn" player
                data[data.turn] === this.playerId
                    ? "S_OUR_TURN"
                    : "S_THEIR_TURN"
        });
    };

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
