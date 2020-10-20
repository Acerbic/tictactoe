/**
 * Manages opening connections on ws (players [re-]connecting to the game).
 *
 * Exports a function that attaches a listener to a SocketIO server. That listener
 * is waiting for "connection" events (new ws connection opened), analyses connection
 * query data and either creates a new GameRoomInterpreter or selects an existing
 * GameRoomInterpreter, to which it forwards the new opened socket.
 */

import { statelog, hostlog, errorlog, debuglog, GhostOutSocket } from "./utils";

import { Socket, Server as SocServer } from "socket.io";
import { StateListener } from "xstate/lib/interpreter";

import { PlayerId } from "@trulyacerbic/ttt-apis/gmaster-api";
import { API } from "@trulyacerbic/ttt-apis/ghost-api";
import { GameRoomInterpreter } from "./state-machine/GameRoomInterpreter";
import GmasterConnector from "./connectors/gmaster_connector";
import {
    GameRoomEvent,
    GameRoomContext
} from "./state-machine/game-room/game-room-schema";

import { regenerate } from "./auth";

export class SocketDispatcher {
    /**
     * Connected players. For each playerId, it remembers its current socket and
     * assigned game room;
     *
     * socket can be undefined if the player is reconnecting; room can be
     * undefined if the player is in-between games (but still connected);
     * socket and room should not be undefined at the same time though.
     *
     * A single room can be assigned to more than one player.
     */
    private playersConnected = new Map<
        PlayerId,
        { socket?: GhostOutSocket; room?: GameRoomInterpreter }
    >();

    /**
     * Injected dependencies to be provided to xstate Interpreter
     */
    private deps = {
        gmaster: new GmasterConnector()
    };

    private dropRoom(room: GameRoomInterpreter) {
        const p1 = room.state.context.player1;
        const p2 = room.state.context.player2;

        if (p1 && this.playersConnected.has(p1)) {
            this.playersConnected.get(p1)!.room = undefined;
        }
        if (p2 && this.playersConnected.has(p2)) {
            this.playersConnected.get(p2)!.room = undefined;
        }
    }

    private isPlayerInGame(playerId: PlayerId): boolean {
        const room = this.playersConnected.get(playerId)?.room;
        return !!(room?.initialized && !room.state.matches("players_setup"));
    }

    private getRoomForPlayer(playerId: string): GameRoomInterpreter {
        hostlog("getting room for player %s", playerId);

        // fetch player's connection data
        const playerConnection = this.playersConnected.get(playerId);
        if (!playerConnection) {
            throw new Error(
                `Player ${playerId} was not found in playersConnected Map`
            );
        }

        // if there's an active room for this player ID, treat this as reconnect
        if (playerConnection.room) {
            return playerConnection.room;
        }

        // if there are waiting rooms in the queue then pick the first from the
        // queue
        const playersWaitingForOpponents = [
            ...this.playersConnected.entries()
        ].filter(([_, { room }]) => room && room.playersCount() < 2);

        if (playersWaitingForOpponents.length > 0) {
            return playersWaitingForOpponents[0][1].room!;
        }

        // create a fresh new room
        const newRoom = new GameRoomInterpreter(this.deps);
        playerConnection.room = newRoom;
        newRoom
            .onTransition(
                // just logging
                (r => (_: any, event: GameRoomEvent) =>
                    statelog(
                        "Transition in room {%s}: (%s) -> %O",
                        r.roomId,
                        event.type,
                        r.getDetailedStateValue()
                    ))(newRoom)
            )
            .onDone(() => this.dropRoom(newRoom))
            .start();
        // hostlog("game room created: %s", newRoom.roomId);
        return newRoom;
    }

    private rememberPlayerConnection(playerId: string, socket: GhostOutSocket) {
        // storing or updating connection data
        const connData = this.playersConnected.get(playerId);
        if (connData?.socket?.connected) {
            // Error. Player with same ID is trying to connect on a different socket.
            socket.emit("server_error", {
                message: "This player has connected already.",
                abandonGame: true
            });
            socket.disconnect(true);
        }
        this.playersConnected.set(playerId, {
            // preserving other connection data - room.
            ...this.playersConnected.get(playerId),
            socket
        });
        (socket as Socket).on("disconnect", () => {
            this.playersConnected.get(playerId)!.socket = undefined;
        });
    }

    attach(ioServer: SocServer) {
        // attach important socket handlers
        ioServer.on("connection", (socket: GhostOutSocket) => {
            const conn_query: API["connection"] = socket.handshake.query;

            // NOTE: playerId should remain const for the duration of connection
            //       but playerName (and its dependence - token) can be changed
            //       during the connection
            let { playerId, playerName, token } = regenerate(conn_query);
            const isInGame = this.isPlayerInGame(playerId);

            hostlog(
                "Player (%s) %s connected on socket  %s",
                playerId,
                playerName,
                socket.id
            );

            this.rememberPlayerConnection(playerId, socket);

            // confirm to client and refresh the token for the upcoming game
            socket.emit("connection_ack", {
                token,
                isInGame
            });

            socket.on("renamed", newName => {
                hostlog(
                    "Player %s (%s) was renamed to %s",
                    playerName,
                    playerId,
                    newName
                );
                const newConnData = regenerate({
                    playerName: newName,
                    token
                });
                token = newConnData.token;
                playerName = newConnData.playerName;
                socket.emit("rename_ack", { token });
            });

            // waiting for the player to initiate a new game or join one from the lobby
            socket.on("start_game", () => {
                try {
                    const room = this.getRoomForPlayer(playerId);

                    hostlog(
                        "Room chosen for player (%s) %s --  %s",
                        playerId,
                        playerName,
                        room.roomId
                    );
                    room.playerJoins(socket, playerId, playerName);
                } catch (e) {
                    hostlog(
                        "Error during connection for player id [%s]",
                        playerId,
                        e
                    );
                    socket.disconnect(true);
                }
            });

            if (isInGame) {
                // player is already in a match that is ongoing
                try {
                    const room = this.getRoomForPlayer(playerId);

                    hostlog(
                        "Player (%s) %s is rejoining room %s",
                        playerId,
                        playerName,
                        room.roomId
                    );
                    room.reconnectPlayer(socket, playerId);
                } catch (e) {
                    hostlog(
                        "Error during reconnection for player id [%s]",
                        playerId,
                        e
                    );
                    socket.disconnect(true);
                }
            }
        });
    }
}
