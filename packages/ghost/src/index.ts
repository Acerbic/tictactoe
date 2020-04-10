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
    prisma: GetGameBoard
};

const GameRooms = new Map<PlayerId, GameRoomInterpreter>();

let waitingRoom = new GameRoomInterpreter(deps);
waitingRoom
    .onTransition(
        (r => (
            state: State<GameRoomContext, GameRoomEvent, GameRoomSchema>,
            event: GameRoomEvent
        ) =>
            statelog(
                "Transition in room {%s}: (%s) -> %O",
                r.roomId,
                event.type,
                r.getDetailedStateValue()
            ))(waitingRoom)
    )
    .start();

hostlog("game room created: %s", waitingRoom.roomId);

// attach important socket handlers
io.on("connection", function(socket) {
    // TODO: auth
    const player_id = socket.handshake.query.playerId;

    if (GameRooms.has(player_id)) {
        // reconnection to the game
        // TODO:
    } else {
        // connect the player to existing room
        waitingRoom.on_socket_connection(socket);
        GameRooms.set(player_id, waitingRoom);

        // if the room is full, create a new room for future players
        if (waitingRoom.playersCount() >= 2) {
            waitingRoom = new GameRoomInterpreter(deps);
            waitingRoom
                .onTransition(
                    (r => (
                        state: State<
                            GameRoomContext,
                            GameRoomEvent,
                            GameRoomSchema
                        >,
                        event: GameRoomEvent
                    ) =>
                        statelog(
                            "Transition in room {%s}: (%s) -> %O",
                            r.roomId,
                            event.type,
                            r.getDetailedStateValue()
                        ))(waitingRoom)
                )
                .start();
            hostlog("game room created: %s", waitingRoom.roomId);
        }
    }
});

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
