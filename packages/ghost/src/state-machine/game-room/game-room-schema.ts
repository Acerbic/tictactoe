/**
 * Description of game-room machine
 * Game "room" is a unique instance of a game that might be awaiting more
 * players to join, be in progress, or be finished
 */

import { StateSchema, Actor } from "xstate";
import { Socket } from "socket.io";
import {
    PlayerId,
    GameId,
    GameState
} from "@trulyacerbic/ttt-apis/gmaster-api";
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
    role_request?: "first" | "second";
    // this holds spawned submachine operating player's setup phase
    setup_actor: Actor<PlayerSetupContext, PlayerSetupEvent>;
}

export interface GameRoomContext {
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

    // holds records for who connected to this room.
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
    player_id: PlayerId;
    socket: Socket;
};

export type GameRoom_PlayerDisconnected = {
    type: "SOC_DISCONNECT";
    player_id: PlayerId;
    socket: Socket;
};

export type GameRoom_PlayerPickRole = {
    type: "SOC_IWANNABETRACER";
    player_id: PlayerId;
    role: "first" | "second";
};

export type GameRoom_PlayerReady = {
    type: "PLAYER_READY";
    player_id: PlayerId;
    desired_role: "first" | "second";
};

export type GameRoom_PlayerMove = {
    type: "SOC_MOVE";
    player_id: PlayerId;
    move: any;
};

export type GameRoomEvent =
    | GameRoom_PlayerConnected
    | GameRoom_PlayerDisconnected
    | GameRoom_PlayerPickRole
    | GameRoom_PlayerReady
    | GameRoom_PlayerMove;
