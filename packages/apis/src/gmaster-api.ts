/**
 * This is API to GMaster process
 */

export type GameId = string;
export type PlayerId = string;
export type GameBoard = [
    [PlayerId | null, PlayerId | null, PlayerId | null],
    [PlayerId | null, PlayerId | null, PlayerId | null],
    [PlayerId | null, PlayerId | null, PlayerId | null]
];

/**
 * Game snapshot as exposed by gmaster API
 */
export type GameState = {
    id: GameId;
    // next turn belongs to...
    turn: "player1" | "player2";
    // player1 always has the first turn;
    player1: PlayerId;
    player2: PlayerId;
    board: GameBoard;
    // current game state (if "over", then `turn` field indicates the
    // player who would've been next, if the game was to continue,
    // i.e. the losing player)
    game: "wait" | "over" | "draw";

    // additional information saved along with the game but not involved with
    // actual gaming logic
    meta: any;
};

export const enum ErrorCodes {
    UNKNOWN_ERROR = 0,
    BAD_ARGUMENTS = 1,
    GAME_NOT_FOUND = 2,
    ILLEGAL_MOVE,
    GAME_ENDED_ALREADY
}

export interface APIResponseFailure {
    success: false;
    errorCode: number;
    errorMessage: string;
}
export interface APIResponseSuccess {
    success: true;
}
export type APIResponse = APIResponseFailure | APIResponseSuccess;

export interface CreateGameRequest {
    player1Id: PlayerId;
    player2Id: PlayerId;
    meta?: any;
}
export interface CreateGameResponse extends APIResponseSuccess {
    gameId: GameId;
    newState: GameState;
}

export interface DropGameRequest {}
export interface DropGameResponse extends APIResponseSuccess {}

export interface CheckGameRequest {}
export interface CheckGameResponse extends APIResponseSuccess {
    state: GameState;
}

type MoveData = {
    column: number;
    row: number;
};

export interface MakeMoveRequest {
    playerId: PlayerId;
    move: MoveData;
}
export interface MakeMoveResponse extends APIResponseSuccess {
    newState: GameState;
}

// aggregate POST and GET requests
export type GameMasterPostRequest =
    | CreateGameRequest
    | DropGameRequest
    | MakeMoveRequest;
export type GameMasterGetRequest = CheckGameRequest;

export type GameMasterResponse =
    | CreateGameResponse
    | DropGameResponse
    | CheckGameResponse
    | MakeMoveResponse;
