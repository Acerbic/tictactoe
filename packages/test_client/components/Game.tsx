import React, { useState } from "react";
import { useMachine } from "@xstate/react";

import { GameBoard, GameBoardProps } from "./GameBoard";
import RoleBtns from "./RoleBtns";
import ConnectGroup from "./ConnectGroup";
import StateMessage from "./StateMessage";
import NewGameButton from "./NewGameButton";
import { clientMachine } from "../state-machine/state-machine";
import { SocketGameConnector } from "../state-machine/SocketGameConnector";

import styles from "./Game.module.css";

interface P {
    game_host_uri: string;
}

const initialBoard: GameBoardProps["board"] = [
    [undefined, undefined, undefined],
    [undefined, undefined, undefined],
    [undefined, undefined, undefined]
];

export const Game: React.FC<P> = props => {
    // const [gameId, setGameId] = useState(null);
    const [playerId, setPlayerId] = useState(null);
    const [board, setBoard] = useState(initialBoard);

    const [state, send] = useMachine(clientMachine);

    // FIXME: submitting incorrect move (occupied cells)
    const cellClicked = (row, column) => {
        console.log(`clicked ${row} - ${column}`);
        if (!state.matches("game.our_turn")) {
            return;
        }

        send({ type: "UI_MOVE_CHOSEN", row, column });
    };

    const chooseRole = role => {
        console.log("Requested to be " + role);
        send({ type: "UI_ROLE_PICKED", role });
    };

    const startNewGame = (playerId: string) => {
        setBoard(initialBoard);

        // initiate new connection to game server
        const con = new SocketGameConnector(
            props.game_host_uri,
            setBoard,
            send,
            playerId
        );

        // switch state to a new game start
        send({
            type: "UI_NEW_GAME",
            connection: con
        });
    };

    return (
        <>
            <section className={styles.content}>
                <div id={styles.game}>
                    <GameBoard board={board} onCellClick={cellClicked} />
                    <h1>
                        <StateMessage state={state} />
                    </h1>
                </div>
                <div id={styles.controls} className="container-fluid">
                    <div className="row">
                        <form className="col">
                            <ConnectGroup
                                disabled={!state.matches("initial")}
                                connectBtn={playerId => {
                                    setPlayerId(playerId);
                                    startNewGame(playerId);
                                }}
                            />
                            <RoleBtns
                                disabled={!state.matches("role_picking")}
                                chooseRole={chooseRole}
                            />
                            {state.matches("end") && (
                                <NewGameButton
                                    onClick={() => startNewGame(playerId)}
                                />
                            )}
                        </form>
                    </div>
                </div>
            </section>
        </>
    );
};
export default Game;
