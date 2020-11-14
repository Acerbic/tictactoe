/**
 * Main content of the page. Instantiates xstate, root of game-related display.
 */

import React, { useState, useEffect } from "react";
import { useRecoilValue } from "recoil";
import { useMachine } from "@xstate/react";
import decode from "jwt-decode";

import { GameDisplay, P as GameDisplayProps } from "./GameDisplay";
import { clientMachine } from "../../state-machine/state-machine";
import {
    PlayerAuthState,
    playerAuthState,
    roleAssignedState
} from "../../state-defs";
import { JWTSession } from "@trulyacerbic/ttt-apis/ghost-api";
import { GameBoard as GameBoardDataType } from "@trulyacerbic/ttt-apis/gmaster-api";

import { useSocketGameConnector } from "../useSocketGameConnector";
import { useSetRecoilState } from "recoil";

const initialBoard: GameBoardDataType = [
    [null, null, null],
    [null, null, null],
    [null, null, null]
];

const playerWasRenamed = (player: PlayerAuthState): boolean => {
    if (!player.name || !player.token) {
        return false;
    }
    try {
        const payload = decode(player.token) as JWTSession;
        return player.name !== payload.playerName;
    } catch (e) {
        return false;
    }
};

export const Game: React.FC = () => {
    const player = useRecoilValue(playerAuthState);
    const roleAssigner = useSetRecoilState(roleAssignedState);

    // board is local state to this Game component
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
    const socConnector = useSocketGameConnector(send, setBoard);

    if (socConnector) {
        // somewhat roundabout way to react to renaming event
        if (playerWasRenamed(player!)) {
            socConnector.emit_renamed(player!.name!);
        }
    }

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
