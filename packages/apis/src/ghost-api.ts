/**
 * Documents socket messages and their data shape
 */

import { GameState, PlayerId, GameId } from "./gmaster-api";

export type Role = "first" | "second";

export type RoomId = string;
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
        // join existing room or start a new one
        start_game: { roomId: RoomId } | void;

        // in response to "choose_role"
        iwannabetracer: Role;

        // in-between receiving "game_started" and "gameover"
        move: any /* Uses ack function to return move validity */;

        // signal to abort the game (conceed)
        imdone: void;

        // the following are not implemented yet:
        // request out-of-order update on game in progress
        remind_me: any;
    };
    out: {
        connection_ack: {
            // JWT signed token includes playerName and assigned playerId;
            token: string;
            // if true, then this playerId is in active match right now (will be
            // followed by "update"); if false, the client must emit "start_game"
            // to proceed
            isInGame: boolean;
        };

        // in response to "start_game"
        choose_role: void;

        // after client receives this the game is ready to be played and the
        // client can send "move" messages
        game_started: {
            gameId: GameId;
            role: Role;
            opponentName: string;
        };
        // includes update on whos turn it is now for switching turns
        update: GameState;

        // after the game concluded for any reason - be it victory, draw or rage quit
        gameover: {
            // null means a draw
            winner: PlayerId | null;
        };

        // some sort of internal mistake happened, the client should reset
        server_error: {
            message: string;
            abandonGame: boolean;
        };

        // the following are not implemented yet
        ragequit: any;
    };
}
