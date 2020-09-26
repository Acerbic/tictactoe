/**
 * Main content of the page. Instantiates xstate, root of game-related display.
 */

import React, { useState, useEffect } from "react";
import { useRecoilValue, useRecoilCallback } from "recoil";
import { useMachine } from "@xstate/react";
import decode from "jwt-decode";

import { GameDisplay, P as GameDisplayProps } from "./GameDisplay";
import { clientMachine } from "../../state-machine/state-machine";
import { SocketGameConnector } from "../../state-machine/SocketGameConnector";
import { playerAuthState, roleAssignedState } from "../../state-defs";
import { JWTSession, Role } from "@trulyacerbic/ttt-apis/ghost-api";
import { GameBoard as GameBoardDataType } from "@trulyacerbic/ttt-apis/gmaster-api";

const initialBoard: GameBoardDataType = [
    [null, null, null],
    [null, null, null],
    [null, null, null]
];

export const Game: React.FC = () => {
    const player = useRecoilValue(playerAuthState);

    // generate a function that when called would set roleAssignedState
    // (to be called from outside of React hooks infrastructure)
    const roleAssigner = useRecoilCallback<[Role], void>(
        ({ set }) => role => {
            set(roleAssignedState, role);
        },
        [roleAssignedState]
    );

    // generate a function that when called would set playerAuthState
    // (to be called from outside of React hooks infrastructure)
    const playerAuthSetter = useRecoilCallback<[string], void>(
        ({ set }) => token => {
            try {
                const payload: JWTSession = decode(token);
                set(playerAuthState, oldValue => ({
                    // name: payload.playerName,
                    ...oldValue,
                    token
                }));
            } catch (error) {
                // TODO?
                console.debug(error, token);
                set(playerAuthState, oldValue => ({
                    ...oldValue,
                    token: null
                }));
            }
        },
        [playerAuthState]
    );

    const [board, setBoard] = useState(initialBoard);

    // initialize state machine
    const [state, send, intrp] = useMachine(clientMachine);

    // attach debug observer to state machine
    useEffect(() => {
        intrp.onTransition(e => {
            console.debug("MACHINE: transition -> %s", e.value.toString(), e);
        });
        intrp.onSend(e => {
            console.debug("MACHINE: send raised", e);
        });
        intrp.onEvent(e => {
            console.debug("MACHINE: event raised", e);
        });
    }, []);

    // initiate permanent ws connection to the server
    useEffect(() => {
        // the connector will use "send" to self-store into the machine's
        // context and to send websocket events into machine. The machine, in
        // return will use its context value to order actions to the connector
        new SocketGameConnector(
            setBoard,
            roleAssigner,
            playerAuthSetter,
            send,
            player
        );
    }, []);

    // TODO: check against submitting incorrect move (occupied cells)
    const cellClicked = (row: number, column: number) => {
        console.log(`clicked ${row} - ${column}`);
        if (!state.matches("game.our_turn")) {
            return;
        }

        send({ type: "UI_MOVE_CHOSEN", row, column });
    };

    const chooseRole = (role: "first" | "second") => {
        console.log("Requested to be " + role);
        send({ type: "UI_ROLE_PICKED", role });
        // preliminary, before the game decided our exact role
        roleAssigner(role);
    };

    const startNewGame = () => {
        setBoard(initialBoard);

        // switch state to a new game start
        send({
            type: "UI_NEW_GAME"
        });
    };

    const dropRoom = () => {
        // not resetting the board just yet - it will happen upon new game start
        send({ type: "UI_RESET" });
    };

    const quitGame = () => {
        send({ type: "UI_QUIT_GAME" });
    };
    const backToLobby = () => {
        send({ type: "UI_BACK_TO_LOBBY" });
    };

    const props: GameDisplayProps = {
        state,
        board,
        startNewGame,
        chooseRole,
        dropRoom,
        cellClicked,
        quitGame,
        backToLobby
    };

    return <GameDisplay {...props}></GameDisplay>;
};

export default Game;
