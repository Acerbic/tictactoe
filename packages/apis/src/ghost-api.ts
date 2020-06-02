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
        move: any /* Uses ack function to return move validity */;
        imdone: void;
        // the following are not implemented yet
        remind_me: any;
    };
    out: {
        choose_role: void;
        you_are_it: {
            gameId: GameId;
            role: "first" | "second";
        };
        // includes update on whos turn it is now for switching turns
        update: GameStateUpdate;
        // your_turn: void;
        gameover: {
            // null means a draw
            winner: PlayerId | null;
        };
        // the following are not implemented yet
        ragequit: any;
        server_error: {
            message: string;
            abandonGame: boolean;
        };
    };
}
