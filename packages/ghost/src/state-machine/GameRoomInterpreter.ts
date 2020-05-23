/**
 * Custom machine interpreter to run GameRoom machine.
 * There's no particular reason to extend standard Interpreter, could've
 * as easily made a distinct class and embed an instance of standard Interpeter
 * in its field.
 */

import { statelog, hostlog, errorlog, debuglog } from "../utils";

import { Machine, Actor } from "xstate";
import { Interpreter } from "xstate/lib/interpreter";

import { PlayerId } from "@trulyacerbic/ttt-apis/gmaster-api";
import GMConnector from "../connectors/gmaster_connector";
import { PrismaGetGameBoard } from "../connectors/hasura_connector";

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

type sendType = Interpreter<
    GameRoomContext,
    GameRoomSchema,
    GameRoomEvent
>["send"];

export class GameRoomInterpreter extends Interpreter<
    GameRoomContext,
    GameRoomSchema,
    GameRoomEvent
> {
    public roomId: string;
    private superSend: sendType;

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
        this.roomId = "#" + roomCount;
        roomCount++;

        // only send events if not in final state
        // overriding `send` here instead of checking before each
        // invokation of `send` for this.state.done flag
        this.superSend = this.send;
        this.send = (...args) => {
            if (!this.state.done) {
                return this.superSend(...args);
            }
            return this.state;
        };
    }

    public getDetailedStateValue() {
        return {
            value: this.state.value,
            children: Array.from(this.children.entries()).map(
                ([name, machine]: [string | number, Actor]) => ({
                    [name]: machine?.state?.value
                })
            ),
            players: Array.from(this.state.context.players.values()).map(
                a => a.id
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

        /**
         * After successful connection player_id will not change, therefor
         * `player_id` could be used to uniquely track both the player and
         * the socket in the system.
         */

        // listen for further socket messages
        socket.once("iwannabetracer", (role: "first" | "second") => {
            this.send({
                type: "SOC_IWANNABETRACER",
                player_id,
                role
            });
        });

        socket.on("move", (move: any) => {
            this.send({ type: "SOC_MOVE", player_id, move });
        });

        // raise machine EVENT - SOC_CONNECT
        debuglog("User %s connected", player_id);
        this.send({
            type: "SOC_CONNECT",
            player_id,
            socket
        });
    }

    playersCount = () => (this.state ? this.state.context.players.size : 0);

    isRoomFull = () =>
        this.state ? this.state.context.players.size >= 2 : true;

    isGameInProgress = () =>
        this.state
            ? this.playersCount() >= 2 &&
              !this.state.matches("setup") &&
              !this.state.done
            : false;

    hasPlayer = (playerId: string) => {
        return this.state.context.players.has(playerId);
    };
}
