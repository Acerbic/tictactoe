import { GameId } from '../db/db.js';
import { StateValue } from 'xstate';

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
}

export interface DropGameRequest {}
export interface DropGameResponse extends RESTBaseResponse {}

export interface CheckGameRequest {}
export interface CheckGameResponse extends RESTBaseResponse {
    state : StateValue;
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
    newState: StateValue;
}