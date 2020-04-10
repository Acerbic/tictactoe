/**
 * Description of game-room machine
 * Game "room" is a unique instance of a game that might be awaiting more
 * players to join, be in progress, or be finished
 */

import { StateSchema } from "xstate";
import { Socket } from "socket.io";
import { PlayerId, GameId, GameState } from "../../connectors/gmaster_api";
import { PlayerSetupEvent } from "../player-setup/player-setup-schema";

import GMConnector from "../../connectors/gmaster_connector";
import { PrismaGetGameBoard } from "../../connectors/prisma_connector";

export interface GameRoomSchema extends StateSchema<GameRoomContext> {
    states: {
        setup: {
            states: {
                player1: {
                    states: {
                        player_setup: {};
                        player_setup_done: {};
                    };
                };
                player2: {
                    states: {
                        player_setup: {};
                        player_setup_done: {};
                    };
                };
            };
        };
        role_requests_taken: {};
        roles_assigned: {};
        wait4move: {};
        game_move: {};
        move_result: {};
        end: {};
    };
}

export interface PlayerInfo {
    id: PlayerId;
    socket: Socket;
    role_request: "first" | "second";
    submachine_id: "player1" | "player2";
}

export interface GameRoomContext {
    // since game master operates on 'player1' and 'player2' tokens
    // we need to keep mapping of those to player ids.
    player1?: PlayerId;
    player2?: PlayerId;

    // id of the current player (the one who's turn is next)
    current_player?: PlayerId;

    // game id in gamesDB of this game room (assigned after creation by game master)
    game_id?: GameId;

    // latest game state, reported after a move was accepted by game master
    latest_game_state?: GameState;

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
    player_id: string;
    socket: any;
    submachine_id: "player1" | "player2";
};

export type GameRoom_PlayerPickRole = {
    type: "SOC_IWANNABETRACER";
    player_id: string;
    role: "first" | "second";
    submachine_id: "player1" | "player2";
};

export type GameRoomEvent =
    | GameRoom_PlayerConnected
    | GameRoom_PlayerPickRole
    | { type: "SOC_MOVE"; move: { row: number; column: number } }
    | PlayerSetupEvent;
