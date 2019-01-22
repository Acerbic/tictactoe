import { GameId, PlayerId } from 'ttt-db';

export type GameState = {
    turn: "player1" | "player2",
    game: "wait" | "over" | "draw"
}

interface RESTBaseResponse {
    success : boolean;
    errorCode? : number;
    errorMessage? : string;
}

export interface CreateGameRequest {
    player1Id : any;
    player2Id : any;
}
export interface CreateGameResponse extends RESTBaseResponse {
    gameId? : GameId;
    newState? : GameState;
}

export interface DropGameRequest {}
export interface DropGameResponse extends RESTBaseResponse {}

export interface CheckGameRequest {}
export interface CheckGameResponse extends RESTBaseResponse {
    state : GameState;
}

type MoveData = {
    column: number;
    row: number;
}

export interface MakeMoveRequest {
    playerId : any;
    move : MoveData;
}
export interface MakeMoveResponse extends RESTBaseResponse {
    newState: GameState;
}

// aggregate 
export type GameMasterPostRequest = CreateGameRequest | DropGameRequest | MakeMoveRequest;
export type GameMasterGetRequest = CheckGameRequest;

export type GameMasterResponse = CreateGameResponse | DropGameResponse | 
    CheckGameResponse | MakeMoveResponse;