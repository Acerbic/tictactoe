/**
 * Custom machine interpreter to run GameRoom machine.
 * There's no particular reason to extend standard Interpreter, could've
 * as easily made a distinct class and embed an instance of standard Interpeter
 * in its field.
 */

const statelog = require("debug")("ttt:ghost:state-machine");
const errorlog = require("debug")("ttt:ghost:error");
const debuglog = require("debug")("ttt:ghost:debug");

import { Machine, Actor } from "xstate";
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
import { Socket } from "socket.io";

export type GameRoomInterpreterDependencies = {
    gmaster: GMConnector;
    prisma: PrismaGetGameBoard;
};

let roomCount = 1;
export class GameRoomInterpreter extends Interpreter<
    GameRoomContext,
    GameRoomSchema,
    GameRoomEvent
> {
    roomId: string;
    promiseChain: Promise<any>;

    /**
     * starts up a separate game room to host a game
     */
    constructor(deps: GameRoomInterpreterDependencies) {
        super(
            Machine(state_machine, machine_options, <GameRoomContext>{
                player_setup_machines: new Map(),
                players: new Map(),
                emits_sync: Promise.resolve(),

                gm_connect: deps.gmaster,
                getBoard: deps.prisma
            })
        );
        this.roomId = "#" + roomCount;
        roomCount++;
        this.promiseChain = Promise.resolve();
    }

    getDetailedStateValue() {
        return {
            value: this.state.value,
            children: Array.from(this.children.entries()).map(
                ([name, machine]: [string | number, Actor]) => ({
                    [name]: machine?.state?.value
                })
            )
        };
    }

    onSocketConnection(socket: Socket) {
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
        socket.on("disconnect", () => {
            debuglog(
                "user disconnected (id=%s), socket=%s",
                player_id,
                socket.id
            );
            this.send({
                type: "SOC_DISCONNECT",
                socket,
                player_id
            });
        });

        // listen for further socket messages

        socket.once("iwannabetracer", (role: "first" | "second") => {
            // raise machine EVENT
            this.send({
                type: "SOC_IWANNABETRACER",
                socket,
                role
            });
        });

        socket.on("move", (move: any) => {
            this.send({ type: "SOC_MOVE", move });
        });

        // raise machine EVENT - SOC_CONNECT
        debuglog("User %s connected as %s", player_id, submachine_id);
        this.send({
            type: "SOC_CONNECT",
            player_id,
            socket
        });
    }

    playersCount = () => (this.state ? this.state.context.players.size : 0);

    isRoomFull = () =>
        this.state ? this.state.context.player_setup_machines.size >= 2 : true;

    isGameInProgress = () =>
        this.state
            ? this.playersCount() >= 2 &&
              !this.state.matches("setup") &&
              !this.state.done
            : false;
}
