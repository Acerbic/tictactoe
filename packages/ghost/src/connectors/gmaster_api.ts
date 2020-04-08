/**
 * This is API to GMaster process
 */

export type GameState = {
    turn: "player1" | "player2";
    game: "wait" | "over" | "draw";
};

export type GameId = string;
export type PlayerId = string;

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
