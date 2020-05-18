/**
 * Documents socket messages and their data shape
 */

import { GameState, PlayerId, GameId } from "./gmaster-api";

export type GameBoard = [
    [string?, string?, string?],
    [string?, string?, string?],
    [string?, string?, string?]
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
 * `never` representing no data send over and `any` - unrestricted value
 */
export interface API {
    in: {
        /**
         * pseudo-message (issued by opening connection).
         * the contents is a `query` param to the opening call
         */
        connection: {
            playerId: PlayerId;
        };
        iwannabetracer: "first" | "second";
        move: any;
        // the following are not implemented yet
        remind_me: any;
        imdone: any;
    };
    out: {
        choose_role: never;
        iamalreadytracer: never;
        you_are_it: "first" | "second";
        your_turn: never;
        opponent_moved: GameStateUpdate;
        meme_accepted: GameStateUpdate;
        gameover: {
            winner: PlayerId;
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
