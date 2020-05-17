/**
 * Manages opening connections on ws (players [re-]connecting to the game).
 *
 * Exports a function that attaches a listener to a SocketIO server. That listener
 * is waiting for "connection" events (new ws connection opened), analyses connection
 * query data and either creates a new GameRoomInterpereter or selects an existing
 * GameRoomInterperter, to which it forwards the new opened socket.
 */

import { statelog, hostlog, errorlog, debuglog } from "./utils";

import { Socket, Server as SocServer } from "socket.io";

import { GameRoomInterpreter } from "./state-machine/GameRoomInterpreter";
import GmasterConnector from "./connectors/gmaster_connector";
import { GetGameBoard } from "./connectors/prisma_connector";
import { PlayerId } from "./connectors/gmaster_api";
import { GameRoomEvent } from "./state-machine/game-room/game-room-schema";

export class SocketDispatcher {
    /**
     * Rooms awaiting players to join
     */
    private awaitingGameRooms: Array<GameRoomInterpreter> = [];
    // Rooms with games in progress (for reconnect)
    private activeGameRooms = new Map<PlayerId, GameRoomInterpreter>();

    /**
     * Injected dependencies to be provided to xstate Interperter
     */
    private deps = {
        gmaster: new GmasterConnector(),
        prisma: GetGameBoard,
        // NOTE: if game-room machine is implemented as actor in higher-order
        //       ghost machine, these would be events to the parent
        promoteRoom: (room: GameRoomInterpreter) => {
            const roomInd = this.awaitingGameRooms.findIndex(r => r === room);
            if (roomInd >= 0) {
                this.awaitingGameRooms.splice(roomInd, 1);
            }
            for (let playerId of room.state.context.players.keys()) {
                this.activeGameRooms.set(playerId, room);
            }
        },
        dropRoom: (room: GameRoomInterpreter) => {
            this.activeGameRooms.delete(room.state.context.player1!);
            this.activeGameRooms.delete(room.state.context.player2!);
        }
    };

    private getRoomForSocketEvent(
        socketId: Socket["id"],
        playerId: string
    ): GameRoomInterpreter {
        hostlog("getting room for player %s", playerId);
        debuglog("awaiting: ", this.awaitingGameRooms.map(r => r.roomId));
        debuglog(
            "active: ",
            [...this.activeGameRooms.entries()].map(
                ([p, r]) => `${p} => ${r.roomId}`
            )
        );

        // if there's an active room for this player ID, treat this as reconnect
        if (this.activeGameRooms.has(playerId)) {
            return this.activeGameRooms.get(playerId)!;
        }

        // if there are waiting rooms in the queue, check that the player is not
        // already listed as waiting in one of the rooms and then pick the first
        // from the queue
        if (this.awaitingGameRooms.length > 0) {
            for (let r of this.awaitingGameRooms) {
                if (r.hasPlayer(playerId)) {
                    throw "Only permitted one connection per player";
                }
            }
            return this.awaitingGameRooms[0];
        }

        // create a fresh new room
        const newRoom = new GameRoomInterpreter(this.deps);
        newRoom
            .onTransition(
                (r => (_: any, event: GameRoomEvent) =>
                    statelog(
                        "Transition in room {%s}: (%s) -> %O",
                        r.roomId,
                        event.type,
                        r.getDetailedStateValue()
                    ))(newRoom)
            )
            .start();
        hostlog("game room created: %s", newRoom.roomId);
        this.awaitingGameRooms.push(newRoom);
        return newRoom;
    }

    attach(ioServer: SocServer) {
        // attach important socket handlers
        ioServer.on("connection", socket => {
            // TODO: auth
            const player_id = socket.handshake.query.playerId;

            try {
                const room = this.getRoomForSocketEvent(socket.id, player_id);

                hostlog(
                    "On-connection for player %s, dropping to room: %s",
                    player_id,
                    room.roomId
                );
                room.onSocketConnection(socket);
            } catch (e) {
                hostlog(
                    "Error during connection for player id [%s]",
                    player_id,
                    e
                );
                socket.disconnect(true);
            }
        });
    }
}