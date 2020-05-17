/**
 * Custom machine interpreter to run GameRoom machine.
 * There's no particular reason to extend standard Interpreter, could've
 * as easily made a distinct class and embed an instance of standard Interpeter
 * in its field.
 */

import  {statelog, hostlog, errorlog, debuglog} from "../utils"

import { Machine, Actor, State } from "xstate";
import { Interpreter, StateListener } from "xstate/lib/interpreter";

import { PlayerId } from "@trulyacerbic/ttt-apis/gmaster-api";
import GMConnector from "../connectors/gmaster_connector";
import { PrismaGetGameBoard } from "../connectors/prisma_connector";

import {
    GameRoomContext,
    GameRoomSchema,
    GameRoomEvent
} from "./game-room/game-room-schema";
import { state_machine, machine_options } from "./game-room/game-room-machine";
import { Socket } from "socket.io";
import { PlayerSetupContext } from "./player-setup/player-setup-schema";

export type GameRoomInterpreterDependencies = {
    gmaster: GMConnector;
    prisma: PrismaGetGameBoard;
    promoteRoom: (room: GameRoomInterpreter) => void;
    dropRoom: (room: GameRoomInterpreter) => void;
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
    deps: GameRoomInterpreterDependencies;
    private superSend: sendType;

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
        this.deps = deps;
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
            player_setup_machines: Array.from(this.state.context.player_setup_machines.values()).map(a => a.id)
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

        // listen for further socket messages
        socket.once("iwannabetracer", (role: "first" | "second") => {
            this.send({
                type: "SOC_IWANNABETRACER",
                socket,
                role
            });
        });

        socket.on("move", (move: any) => {
            this.send({ type: "SOC_MOVE", move });
        });

        const promoter: StateListener<
            GameRoomContext,
            GameRoomEvent
        > = state => {
            if (!state.matches("players_setup")) {
                this.deps.promoteRoom(this);
                this.off(promoter); // self-remove ("once")
            }
        };
        this.onTransition(promoter);
        this.onDone(e => {
            this.deps.dropRoom(this);
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
        this.state ? this.state.context.player_setup_machines.size >= 2 : true;

    isGameInProgress = () =>
        this.state
            ? this.playersCount() >= 2 &&
              !this.state.matches("setup") &&
              !this.state.done
            : false;
    
    hasPlayer = (playerId: string) => {
        // TODO: oof.
        for (let psma  of this.state.context.player_setup_machines.values()) {
            if ((psma.state! as State<PlayerSetupContext>).context.player_id === playerId) {
                return true;
            }
        }
        return false;
    }
}
