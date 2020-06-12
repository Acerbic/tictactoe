/**
 * Definitions for state machine
 */

import { State, StateSchema, EventObject } from "xstate";
import { RoomId } from "@trulyacerbic/ttt-apis/ghost-api";

type RoleChoice = "first" | "second";

/**
 * Abstraction that uses xstate actions to send signals to the game server and
 * uses signals back as xstate events
 */
export interface GameConnector {
    actions: {
        emit_start_game: (roomId?: RoomId) => void;
        emit_iwannabetracer: (role: RoleChoice) => void;
        emit_move: (row: number, column: number) => void;

        emit_drop_room: () => void;
        emit_im_done: () => void;
    };
}

export interface ClientContext {
    gameConnector: GameConnector | null;
}

export interface ClientSchema extends StateSchema<ClientContext> {
    states: {
        // boot-up state
        initial: {};
        // here, connection to back end is established
        lobby: {};
        // after game room creation was called and server prompted to pick role
        role_picking: {};
        // game setup done, waiting in room for the opponent
        waiting4opponent: {};
        // the game itself
        game: {
            states: {
                // this is some temporary state to put machine into
                // during reconnection. The following "update" message
                // from the server will shift it into state
                reconnecting: {};
                our_turn: {
                    states: {
                        // the player is deliberating over the next move
                        thinking: {};
                        // sent the move to the backend for validation (with
                        // ack-function)
                        moved: {};
                    };
                };
                // waiting for the opponent to make their move
                their_turn: {};
            };
        };

        // after the game ended
        end: {
            states: {
                draw: {};
                victory: {};
                defeat: {};
            };
        };
    };
}

/************************************************************/
/* Events originating from React - User interactions mostly */

// export interface UI_Connect extends EventObject {
//     type: "UI_CONNECT";
//     connector: GameConnector;
// }
export interface UI_RolePickedEvent extends EventObject {
    type: "UI_ROLE_PICKED";
    role: "first" | "second";
}

export interface UI_MoveChosenEvent extends EventObject {
    type: "UI_MOVE_CHOSEN";
    row: number;
    column: number;
}

/**
 * Create a new game room or join into existing waiting room
 */
export interface UI_NewGameEvent extends EventObject {
    type: "UI_NEW_GAME";
    roomId?: RoomId;
}

/**
 * Cancel waiting in game room for an opponent to join
 */
export interface UI_ResetEvent extends EventObject {
    type: "UI_RESET";
}

/**
 * After game ends, go from the end screen to the lobbby
 */
export interface UI_BackToLobby extends EventObject {
    type: "UI_BACK_TO_LOBBY";
}

// notifying the server that the game is forfeit
export interface UI_QuitGame extends EventObject {
    type: "UI_QUIT_GAME";
}

/************************************************************/
/*
Events produced from messages received over websocket (signals from the server)
*/

export interface S_ConnectedEvent extends EventObject {
    type: "S_CONNECTED";
    connector: GameConnector;
}

export interface S_ReconnectedEvent extends EventObject {
    type: "S_RECONNECTED";
    connector: GameConnector;
}

export interface S_ChooseRole extends EventObject {
    type: "S_CHOOSE_ROLE";
}

// export interface S_RoomDroppedEvent extends EventObject {
//     type: "ROOM_DROPPED";
// }
export interface S_GameStartEvent extends EventObject {
    type: "S_GAME_START";
    role: "first" | "second";
}
export interface S_NextTurnEvent extends EventObject {
    type: "S_NEXT_TURN";
}
export interface S_GameEndEvent extends EventObject {
    type: "S_GAME_END";
    outcome: "win" | "fail" | "meh";
}

export interface S_MoveRejected extends EventObject {
    type: "S_MOVE_REJECTED";
    move: { row: number; column: number };
}

// export interface S_MoveAccepted extends EventObject {
//     type: "S_MOVE_ACCEPTED";
// }

export interface S_OurTurn extends EventObject {
    type: "S_OUR_TURN";
}

export interface S_TheirTurn extends EventObject {
    type: "S_THEIR_TURN";
}

/**
 * Grouping of events that come from React
 * (due to user interactions)
 */
export type UI_Event =
    // | UI_Connect
    | UI_NewGameEvent
    | UI_RolePickedEvent
    | UI_ResetEvent
    | UI_MoveChosenEvent
    | UI_QuitGame
    | UI_BackToLobby;

/**
 * Events originating from the game server messages
 */
export type Server_Event =
    // | S_RoomDroppedEvent
    | S_ConnectedEvent
    | S_ReconnectedEvent
    | S_ChooseRole
    | S_GameStartEvent
    | S_OurTurn
    | S_TheirTurn
    | S_NextTurnEvent
    | S_MoveRejected
    // | S_MoveAccepted
    | S_GameEndEvent;

/**
 * full list of events
 */
export type ClientEvent = UI_Event | Server_Event;

/**
 * type of `Interpreter["send"]`
 */
export type ClientEventSender = (
    e: ClientEvent
) => State<ClientContext, ClientEvent, ClientSchema>;
