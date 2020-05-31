/**
 * Main content of the page. Instantiates xstate, root of game-related display.
 */

import React, { useState } from "react";
import { useRecoilValue, useRecoilCallback } from "recoil";
import { useMachine } from "@xstate/react";

import { GameBoard, GameBoardProps } from "./GameBoard";
import StateMessage from "./StateMessage";
import NewGameButton from "./NewGameButton";
import { PopBanner } from "./PopBanner";
import { AnnouncerText } from "./AnnouncerText";

import { clientMachine } from "../state-machine/state-machine";
import { SocketGameConnector } from "../state-machine/SocketGameConnector";
import { playerState, roleAssignedState } from "../state-defs";

const initialBoard: GameBoardProps["board"] = [
    [null, null, null],
    [null, null, null],
    [null, null, null]
];

export const Game: React.FC = () => {
    // const [gameId, setGameId] = useState(null);

    const player = useRecoilValue(playerState);
    const roleAssigner = useRecoilCallback(
        ({ set }, role) => {
            set(roleAssignedState, role);
        },
        [player]
    );
    const [board, setBoard] = useState(initialBoard);

    const [state, send] = useMachine(clientMachine);

    // FIXME: submitting incorrect move (occupied cells)
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

        // initiate new connection to game server
        const con = new SocketGameConnector(
            setBoard,
            roleAssigner,
            send,
            player!.id
        );

        // switch state to a new game start
        send({
            type: "UI_NEW_GAME",
            connection: con
        });
    };

    const dropGameConnection = () => {
        // not resetting the board just yet - it will happen upon new game start
        send({ type: "UI_RESET" });
    };

    let stateRendered: JSX.Element = <></>;
    switch (true) {
        case !player:
            stateRendered = (
                <PopBanner>Sorry, need to login to play.</PopBanner>
            );
            break;

        case state.matches("initial"):
            stateRendered = (
                <PopBanner title="Do you want to play a game? o^_^o">
                    <button onClick={startNewGame} className="btn btn-blue">
                        Yes
                    </button>
                </PopBanner>
            );
            break;

        case state.matches("awaiting_connection"):
            stateRendered = (
                <PopBanner>
                    <StateMessage state={state} />
                </PopBanner>
            );
            break;

        case state.matches("role_picking"):
            stateRendered = (
                <PopBanner title="Pick wisely!">
                    <h3 className="text-xl mb-3">Who you gonna be?</h3>
                    <button
                        onClick={() => chooseRole("first")}
                        className="btn btn-blue mx-3"
                    >
                        Bass
                    </button>
                    <button
                        onClick={() => chooseRole("second")}
                        className="btn btn-blue mx-3"
                    >
                        Base
                    </button>
                </PopBanner>
            );
            break;

        case state.matches("waiting4opponent"):
            stateRendered = (
                <PopBanner>... waiting for opponent to join...</PopBanner>
            );
            break;

        default:
            stateRendered = (
                <>
                    <GameBoard board={board} onCellClick={cellClicked} />
                    <AnnouncerText>
                        <StateMessage state={state} />
                    </AnnouncerText>
                    {!state.matches("end") && (
                        <button
                            type="button"
                            className="btn btn-blue"
                            onClick={dropGameConnection}
                        >
                            Quit
                        </button>
                    )}
                    {state.matches("end") && (
                        <NewGameButton onClick={startNewGame} />
                    )}
                </>
            );
    }

    return (
        <section className="flex items-center justify-center h-full">
            <div className="flex-none">{stateRendered}</div>
        </section>
    );
};

export default Game;
