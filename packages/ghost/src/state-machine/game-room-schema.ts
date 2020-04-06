import { PlayerId, GameId, Game } from "ttt-db";
import { GameState } from "ttt-gmasterREST";
import { PlayerSetupEvent } from "./player-setup-schema";

export interface GameRoomSchema {
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
        role_requested_conflict: {};
        roles_assigned: {};
        wait4move: {};
        game_move: {};
        move_result: {};
        end: {};
    };
}

export interface GameRoomContext {
    // since game master operates on 'player1' and 'player2' tokens
    // we need to keep mapping of those to player ids.
    player1: PlayerId;
    player2: PlayerId;

    // id of the current player (the one who's turn is next)
    current_player: PlayerId;

    // game id in gamesDB
    game_id: GameId;

    // latest game state, reported after a move was accepted by game master
    latest_game_state: GameState;

    players: Map<PlayerId, any>; // Map: PlayerId => PlayerContext

    // Used to synchronize calls to socket.emit (state transitions
    // could cause racing in actions, if action is delaying emit to the
    // later time)
    emits_sync: Promise<any>;
}

export type GameRoomEvent =
    | { type: "SOC_MOVE"; move: { row: number; column: number } }
    | PlayerSetupEvent;
