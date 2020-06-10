/**
 * Main content of the page. Instantiates xstate, root of game-related display.
 */

import React, { useState } from "react";
import { useRecoilValue, useRecoilCallback } from "recoil";
import { useMachine } from "@xstate/react";
import decode from "jwt-decode";

import { GameBoard, GameBoardProps } from "./GameBoard";
import StateMessage from "./StateMessage";
import NewGameButton from "./NewGameButton";
import { PopBanner } from "./PopBanner";
import { AnnouncerText } from "./AnnouncerText";
import { QuitButton } from "./QuitButton";

import { clientMachine } from "../state-machine/state-machine";
import { SocketGameConnector } from "../state-machine/SocketGameConnector";
import { playerAuthState, roleAssignedState } from "../state-defs";
import { JWTSession, Role } from "@trulyacerbic/ttt-apis/ghost-api";

const initialBoard: GameBoardProps["board"] = [
    [null, null, null],
    [null, null, null],
    [null, null, null]
];

export const Game: React.FC = () => {
    const player = useRecoilValue(playerAuthState);

    // generate a function that when called would set roleAssingedState
    // (to be called from outside of React hooks infrastructure)
    const roleAssigner = useRecoilCallback<[Role], void>(
        ({ set }, role) => {
            set(roleAssignedState, role);
        },
        [roleAssignedState]
    );

    // generate a function that when called would set playerAuthState
    // (to be called from outside of React hooks infrastructure)
    const playerAuthSetter = useRecoilCallback<[string], void>(
        ({ set }, token) => {
            const payload: JWTSession = decode(token);

            set(playerAuthState, {
                name: payload.playerName,
                token
            });
        },
        [playerAuthState]
    );

    const [board, setBoard] = useState(initialBoard);

    const [state, send, intrp] = useMachine(clientMachine);
    intrp.onTransition(e => {
        console.debug("MACHINE: transision -> %s", e.value.toString(), e);
    });
    intrp.onSend(e => {
        console.debug("MACHINE: send raised", e);
    });
    intrp.onEvent(e => {
        console.debug("MACHINE: event raised", e);
    });

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
        if (!player) {
            throw new Error("Player Session object is not initiated properly");
        }

        // initiate new connection to game server
        const con = new SocketGameConnector(
            setBoard,
            roleAssigner,
            playerAuthSetter,
            send,
            player
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

    const quitGame = () => {
        send({ type: "UI_QUIT_GAME" });
    };

    let stateRendered: JSX.Element = <></>;
    switch (true) {
        // case !playerId:
        //     stateRendered = (
        //         <PopBanner>Sorry, need to login to play.</PopBanner>
        //     );
        //     break;

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
                <PopBanner>
                    <p className="pt-12">... waiting for opponent to join...</p>
                    <button
                        type="button"
                        className="btn btn-red mt-4"
                        onClick={dropGameConnection}
                    >
                        Quit
                    </button>
                </PopBanner>
            );
            break;

        default:
            stateRendered = (
                <>
                    <div
                        style={{
                            width: "calc(min(60vh, 60vw))",
                            height: "calc(min(60vh, 60vw))",
                            margin: "0 auto"
                        }}
                    >
                        <GameBoard board={board} onCellClick={cellClicked} />
                    </div>
                    <AnnouncerText>
                        <StateMessage state={state} />
                    </AnnouncerText>
                    {!state.matches("end") && (
                        <QuitButton onConfirm={quitGame}></QuitButton>
                    )}
                    {state.matches("end") && (
                        <NewGameButton
                            onClick={startNewGame}
                            style={{
                                position: "absolute",
                                top: "6rem",
                                right: "1em"
                            }}
                        />
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
