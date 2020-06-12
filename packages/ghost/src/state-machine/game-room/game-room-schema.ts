/**
 * Description of game-room machine
 * Game "room" is a unique instance of a game that might be awaiting more
 * players to join, be in progress, or be finished
 */

import { StateSchema, Actor, AnyEventObject } from "xstate";
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
import { GhostOutSocket } from "../../utils";

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
    socket: GhostOutSocket;
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

    // game id in gamesDB of this game room (assigned after creation by game master)
    game_id?: GameId;

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
}

/**
 * `SOC_*` type events originate from socket, but they are describing business
 * logic events, not transport level. I.e. "SOC_CONNECT" doesn't indicate
 * websocket-level (re-)connection attempt, but rather "player connects to the
 * game room" higher-level event.
 */
export type GameRoom_PlayerConnected = {
    type: "SOC_CONNECT";
    player_id: PlayerId;
    socket: GhostOutSocket;
};

export type GameRoom_PlayerDisconnected = {
    type: "SOC_DISCONNECT";
    player_id: PlayerId;
    socket: GhostOutSocket;
};

export type GameRoom_PlayerDropped = {
    type: "SOC_PLAYER_DROP_ROOM";
    player_id: PlayerId;
};

export type GameRoom_PlayerQuit = {
    type: "SOC_PLAYER_QUIT";
    player_id: PlayerId;
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
    ack?: Function;
};

export type GameRoomEvent =
    | GameRoom_PlayerConnected
    | GameRoom_PlayerDisconnected
    | GameRoom_PlayerDropped
    | GameRoom_PlayerQuit
    | GameRoom_PlayerPickRole
    | GameRoom_PlayerReady
    | GameRoom_PlayerMove
    | { type: "error.platform.top_reconnect" }
    | { type: "error.platform.emit_update_both" };

/**
 * Narrow some `AnyEventObject` to one of the `GameRoomEvent` variants
 */
export function isGREvent<
    E extends AnyEventObject,
    T extends GameRoomEvent["type"]
>(e: E, t: T): e is E extends { type: T } ? E : never {
    return e.type === t;
}
