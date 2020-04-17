/**
 * Description of game-room machine
 * Game "room" is a unique instance of a game that might be awaiting more
 * players to join, be in progress, or be finished
 */

import {
    StateSchema,
    Actor,
    Interpreter,
    EventObject,
    AnyEventObject
} from "xstate";
import { Socket } from "socket.io";
import { PlayerId, GameId, GameState } from "../../connectors/gmaster_api";
import {
    PlayerSetupEvent,
    PlayerSetupContext,
    PlayerSetupStateSchema
} from "../player-setup/player-setup-schema";

import GMConnector from "../../connectors/gmaster_connector";
import { PrismaGetGameBoard } from "../../connectors/prisma_connector";

export interface GameRoomSchema extends StateSchema<GameRoomContext> {
    states: {
        players_setup: {};
        roles_setup: {};
        creating_game: {};
        wait4move: {};
        making_move: {};
        end: {};
    };
}

export interface PlayerInfo {
    id: PlayerId;
    // holds connection status in Socket.connected field.
    socket: Socket;
    role_request: "first" | "second";
}

export interface GameRoomContext {
    // this holds spawned submachines during players setup phase
    // size of this set shows number of parallel players going
    // (or finished) player setup
    player_setup_machines: Map<
        Socket["id"],
        Actor<PlayerSetupContext, PlayerSetupEvent>
    >;
    // since game master operates on 'player1' and 'player2' tokens
    // we need to keep mapping of those to player ids.
    // these fields can be undefined during a game's setup, but after that
    // will be holding permanent values
    player1?: PlayerId;
    player2?: PlayerId;

    // id of the current player (the one who's turn is next)
    current_player?: PlayerId;

    // game id in gamesDB of this game room (assigned after creation by game master)
    game_id?: GameId;

    // latest game state, reported after a move was accepted by game master
    latest_game_state?: GameState;

    // holds records for players who finished setup and ready to play.
    // this also tracks player's socket for disconnection/reconnection
    // during the game
    players: Map<PlayerId, PlayerInfo>;

    // Used to synchronize calls to socket.emit (state transitions
    // could cause racing in actions, if action is delaying emit to the
    // later time)
    emits_sync: Promise<any>;

    // Probably should not keep this in StateContext, but it is easier to do this
    // as a form of dependency injection for actions/guards
    gm_connect: GMConnector;
    getBoard: PrismaGetGameBoard;
}

export type GameRoom_PlayerConnected = {
    type: "SOC_CONNECT";
    socket: Socket;
    player_id: PlayerId;
};

export type GameRoom_PlayerDisconnected = {
    type: "SOC_DISCONNECT";
    player_id: PlayerId;
    socket: Socket;
};

export type GameRoom_PlayerPickRole = {
    type: "SOC_IWANNABETRACER";
    socket: Socket;
    role: "first" | "second";
};

export type GameRoom_PlayerReady = {
    type: "PLAYER_READY";
    player_id: PlayerId;
    socket: Socket;
    desired_role: "first" | "second";
};

export type GameRoomEvent =
    | GameRoom_PlayerConnected
    | GameRoom_PlayerDisconnected
    | GameRoom_PlayerReady
    | GameRoom_PlayerPickRole
    | { type: "SOC_MOVE"; move: { row: number; column: number } };
