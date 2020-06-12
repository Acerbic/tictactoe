/**
 * Pure render component for Game component
 */

import React from "react";

import { GameBoard } from "./GameBoard";
import StateMessage from "./StateMessage";
import { PopBanner } from "./PopBanner";
import { AnnouncerText } from "./AnnouncerText";
import { QuitButton } from "./QuitButton";

import { GameControlProps } from "./Game";
import { Button } from "./Button";

export const GameDisplay: React.FC<GameControlProps> = props => {
    const { state } = props;

    let stateRendered: JSX.Element = <></>;
    switch (true) {
        case state.matches("initial"):
            stateRendered = (
                <PopBanner>
                    <StateMessage state={state} />
                </PopBanner>
            );
            break;

        case state.matches("lobby"):
            stateRendered = (
                <PopBanner title="Do you want to play a game? o^_^o">
                    <button
                        onClick={props.startNewGame}
                        className="btn btn-blue"
                    >
                        Yes
                    </button>
                </PopBanner>
            );
            break;

        case state.matches("role_picking"):
            stateRendered = (
                <PopBanner title="Pick wisely!">
                    <h3 className="text-xl mb-3">Who you gonna be?</h3>
                    <button
                        onClick={() => props.chooseRole("first")}
                        className="btn btn-blue mx-3"
                    >
                        Bass
                    </button>
                    <button
                        onClick={() => props.chooseRole("second")}
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
                        onClick={props.dropRoom}
                    >
                        Quit
                    </button>
                </PopBanner>
            );
            break;

        case state.matches("game.reconnecting"):
            stateRendered = (
                <PopBanner>
                    <AnnouncerText>
                        <StateMessage state={state} />
                    </AnnouncerText>
                </PopBanner>
            );
            break;

        case state.matches("game") || state.matches("end"):
            stateRendered = (
                <>
                    <div
                        style={{
                            width: "calc(min(60vh, 60vw))",
                            height: "calc(min(60vh, 60vw))",
                            margin: "0 auto"
                        }}
                    >
                        <GameBoard
                            board={props.board}
                            onCellClick={props.cellClicked}
                        />
                    </div>
                    <AnnouncerText>
                        <StateMessage state={state} />
                    </AnnouncerText>
                    {!state.matches("end") && (
                        <QuitButton onConfirm={props.quitGame}></QuitButton>
                    )}
                    {state.matches("end") && (
                        <Button
                            onClick={props.backToLobby}
                            style={{
                                display: "block",
                                margin: "auto"
                            }}
                        >
                            Go Back to Lobby
                        </Button>
                    )}
                </>
            );
            break;

        default:
            stateRendered = (
                <PopBanner mode="alert">
                    If you are seeing this, something is buggy.
                </PopBanner>
            );
    }

    return (
        <section className="flex items-center justify-center h-full">
            <div className="flex-none">{stateRendered}</div>
        </section>
    );
};

export default GameDisplay;
