/**
 * Documents socket messages and their data shape
 */

import { GameState, PlayerId, GameId } from "./gmaster-api";

export type Role = "first" | "second";

export interface JWTSession {
    playerId: string;
    playerName: string;
}

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
        token?: string;
        playerName?: string;
    };
    in: {
        iwannabetracer: Role;
        move: any /* Uses ack function to return move validity */;
        imdone: void;
        // the following are not implemented yet
        remind_me: any;
    };
    out: {
        connection_ack: {
            // JWT signed token includes playerName and assigned playerId;
            token: string;
        };

        choose_role: void;
        game_started: {
            gameId: GameId;
            role: Role;
            opponentName: string;
        };
        // includes update on whos turn it is now for switching turns
        update: GameState;
        // your_turn: void;
        gameover: {
            // null means a draw
            winner: PlayerId | null;
        };
        server_error: {
            message: string;
            abandonGame: boolean;
        };
        // the following are not implemented yet
        ragequit: any;
    };
}
