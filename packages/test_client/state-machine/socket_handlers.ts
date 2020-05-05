/**
 * Functions to handle socket.io incoming communication events
 */

import { useMachine } from "@xstate/react";

import {
    ClientContext,
    ClientEvent,
    ClientSchema
} from "./state-machine-schema";

// I feel dirty
// @see https://stackoverflow.com/questions/51740472/typescript-returntype-of-a-generic-function-not-working
const __hack = (_: any) => useMachine<ClientContext, ClientEvent>(_);
type XSSender = ReturnType<typeof __hack>[1];

/**
 * Listens on the socket and raises events for xstate machine / react state update
 */
export const attachListeners = (
    socket: SocketIOClient.Socket,
    send: XSSender,
    playerId: string,
    setBoard: (_: any) => any
) => {
    // this one will be received if we are joining a new game
    socket.once("choose_role", () =>
        send({
            type: "CONNECTED"
        })
    );
    // this one will be received (instead of "choose_role") if we
    // are reconnecting to a match in progress
    socket.once("reconnection", r => s_reconnection(r, send, setBoard));

    // those to follow "choose_role" in player configuration process
    socket.once("iamalreadytracer", () => s_iamalreadytracer());
    socket.once("you_are_it", r => s_you_are_it(r, send));

    // those messages are received as part of the game proceedings
    socket.on("your_turn", () => s_your_turn());
    socket.on("meme_accepted", r => s_move_accepted(r, send, setBoard));
    socket.on("opponent_moved", r => s_opponent_moved(r, send, setBoard));
    socket.on("gameover", r => s_gameover(r, send, playerId));
};

// reconnect to an existing game
const s_reconnection = (r, send: XSSender, setBoard: (_: any) => any) => {
    setBoard(r.board);
    send({ type: "RECONNECTED", isMyTurn: r.step === "my-turn" });
};

// received 'choose_role' message
const s_you_are_it = (role: "first" | "second", send: XSSender) => {
    console.log("Received role, we are " + role);
    send({ type: "GAME_START", role });
};

const s_iamalreadytracer = () => {
    console.log("Role will be assigned by coin toss...");
};

const s_your_turn = () => {
    console.log("its my turn!");
};

const s_move_accepted = (
    response,
    send: XSSender,
    setBoard: (_: any) => any
) => {
    console.log("my move was accepted!");
    console.log(response);
    send({ type: "NEXT_TURN" });
    setBoard(response.board);
};

const s_opponent_moved = (
    response,
    send: XSSender,
    setBoard: (_: any) => any
) => {
    console.log("opponent made his move");
    console.log(response);
    send({ type: "NEXT_TURN" });
    setBoard(response.board);
};

const s_gameover = (response, send: XSSender, playerId: string) => {
    console.log("it seems the game is over");
    console.log(response);
    send({
        type: "GAME_END",
        outcome: response.winner
            ? response.winner == playerId
                ? "win"
                : "fail"
            : "meh"
    });
};
