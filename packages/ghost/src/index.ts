import debug from "debug";
import express from "express";
import { createServer } from "http";
import socketio, { Socket } from "socket.io";
import { State } from "xstate";

import { GameRoomInterpreter } from "./state-machine/GameRoomInterpreter";
import GmasterConnector from "./connectors/gmaster_connector";
import { GetGameBoard } from "./connectors/prisma_connector";
import { PlayerId } from "./connectors/gmaster_api";
import {
    GameRoomEvent,
    GameRoomContext,
    GameRoomSchema
} from "./state-machine/game-room/game-room-schema";

const statelog = debug("ttt:ghost:state-machine");
const hostlog = debug("ttt:ghost");

const app = express();
const http = createServer(app);
const io = socketio(http, {
    pingTimeout: process.env.NODE_ENV == "production" ? 3000 : 1000000
});

const deps = {
    gmaster: new GmasterConnector(),
    prisma: GetGameBoard,
    // NOTE: if game-room machine is implemented as actor in higher-order
    //       ghost machine, these would be events to the parent
    promoteRoom: (room: GameRoomInterpreter) => {
        awaitingGameRooms = [...awaitingGameRooms.filter(r => r !== room)];
        for (let playerId of room.state.context.players.keys()) {
            activeGameRooms.set(playerId, room);
        }
    },
    dropRoom: (room: GameRoomInterpreter) => {
        activeGameRooms.delete(room.state.context.player1!);
        activeGameRooms.delete(room.state.context.player2!);
    }
};

// rooms awaiting players to join
let awaitingGameRooms: Array<GameRoomInterpreter> = [];

// Rooms with games in progress (for reconnect)
const activeGameRooms = new Map<PlayerId, GameRoomInterpreter>();

// attach important socket handlers
io.on("connection", function(socket) {
    // TODO: auth
    const player_id = socket.handshake.query.playerId;

    const room = getRoomForSocketEvent(socket.id, player_id);

    hostlog(
        "On-connection for player %s, dropping to room: %s",
        player_id,
        room.roomId
    );
    room.onSocketConnection(socket);
});

function getRoomForSocketEvent(
    socketId: Socket["id"],
    playerId: string
): GameRoomInterpreter {
    hostlog("getting room for player %s", playerId);
    hostlog("awaiting: ", awaitingGameRooms.map(r => r.roomId));
    hostlog(
        "active: ",
        [...activeGameRooms.entries()].map(([p, r]) => `${p} => ${r.roomId}`)
    );

    // if there's an active room for this player ID, treat this as reconnect
    if (activeGameRooms.has(playerId)) {
        return activeGameRooms.get(playerId)!;
    }

    // if there are waiting rooms in the queue, pick one from the queue
    if (awaitingGameRooms.length > 0) {
        return awaitingGameRooms[0];
    }

    // create a fresh new room
    const newRoom = new GameRoomInterpreter(deps);
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
    awaitingGameRooms.push(newRoom);
    return newRoom;
}

// start listening for connections
http.listen(3060, function() {
    hostlog("ghost is listening on *:3060");
});

// Stupid CORS
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
    );
    next();
});
