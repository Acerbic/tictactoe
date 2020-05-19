/**
 * Documents socket messages and their data shape
 */

import { GameState, PlayerId, GameId } from "./gmaster-api";

export type GameBoard = [
    [string | null, string | null, string | null],
    [string | null, string | null, string | null],
    [string | null, string | null, string | null]
];

type GameStateUpdate = {
    game_state: {
        game: GameState["game"];
        turn: PlayerId;
    };
    board: GameBoard;
};

/**
 * keyof API["in"] === names of messages to emit from client to server over ws
 * keyof API["out"] === names of messages to emit from server to client over ws
 *
 * Types of those fields correspond to types of messages data content, with
 * `void` representing no data send over and `any` - unrestricted value
 */
export interface API {
    /**
     * pseudo-message (issued by opening connection).
     * the contents is a `query` param to the opening call
     */
    connection: {
        playerId: PlayerId;
    };
    in: {
        iwannabetracer: "first" | "second";
        move: any;
        // the following are not implemented yet
        remind_me: any;
        imdone: any;
    };
    out: {
        choose_role: void;
        iamalreadytracer: void;
        you_are_it: {
            gameId: GameId;
            role: "first" | "second";
        };
        your_turn: void;
        opponent_moved: GameStateUpdate;
        meme_accepted: GameStateUpdate;
        gameover: {
            // null means a draw
            winner: PlayerId | null;
        };
        reconnection: {
            gameId: GameId;
            board: GameBoard;
            step: "my-turn" | "opponents-turn";
        };
        // the following are not implemented yet
        update: any;
        ragequit: any;
    };
}
