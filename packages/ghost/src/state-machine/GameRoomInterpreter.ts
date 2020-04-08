/**
 * Custom machine interpreter to run GameRoom machine.
 * There's no particular reason to extend standard Interpreter, could've
 * as easily made a distinct class and embed an instance of standard Interpeter
 * in its field.
 */

const statelog = require("debug")("ttt:ghost:state-machine");
const errorlog = require("debug")("ttt:ghost:error");
const debuglog = require("debug")("ttt:ghost:debug");

import { Machine } from "xstate";
import { Interpreter } from "xstate/lib/interpreter";

import { PlayerId } from "../connectors/gmaster_api";
import GMConnector from "../connectors/gmaster_connector";
import { PrismaGetGameBoard } from "../connectors/prisma_connector";

import {
    GameRoomContext,
    GameRoomSchema,
    GameRoomEvent
} from "./game-room/game-room-schema";
import { state_machine, machine_options } from "./game-room/game-room-machine";

export type GameRoomInterpreterDependencies = {
    gmaster: GMConnector;
    prisma: PrismaGetGameBoard;
};
export class GameRoomInterpreter extends Interpreter<
    GameRoomContext,
    GameRoomSchema,
    GameRoomEvent
> {
    /**
     * starts up a separate game room to host a game
     */
    constructor(deps: GameRoomInterpreterDependencies) {
        super(
            Machine(state_machine, machine_options, <GameRoomContext>{
                players: new Map(),
                emits_sync: Promise.resolve(),

                gm_connect: deps.gmaster,
                getBoard: deps.prisma
            })
        );
    }

    on_socket_connection(socket: any) {
        // check connection query arguments
        const player_id: PlayerId = socket.handshake.query.playerId;
        if (!player_id) {
            errorlog("Socket tried to connect without player ID. Refusing.");
            socket.disconnect(true);
            return;
        }
        debuglog(`a user with id = ${player_id} connecting: ${socket.id}`);

        const context = this.state.context;
        if (context.players.size >= 2) {
            // two players have already connected to the game. reject this connection!
            errorlog("too many players %s. Refusing.", socket.id);
            socket.disconnect(true);
            return;
        }

        const submachine_id = ("player" + (context.players.size + 1)) as
            | "player1"
            | "player2";

        // attach variety of socket event handlers
        socket.on("disconnect", function() {
            debuglog(
                "user disconnected (id=%s), socket=%s",
                player_id,
                socket.id
            );
        });

        // listen for further socket messages

        socket.once("iwannabetracer", (role: "first" | "second") => {
            // raise machine EVENT
            this.send({
                type: "SOC_IWANNABETRACER",
                player_id,
                role,
                submachine_id
            });
            statelog("New state: %O", this.state.value);
        });

        socket.on("move", (move: any) => {
            this.send({ type: "SOC_MOVE", move });
        });

        // raise machine EVENT - SOC_CONNECT
        debuglog("User %s connected as %s", player_id, submachine_id);
        this.send({
            type: "SOC_CONNECT",
            player_id,
            socket,
            submachine_id
        });
        statelog("New state: %O", this.state.value);
    }

    playersCount = () => (this.state ? this.state.context.players.size : 0);
}
