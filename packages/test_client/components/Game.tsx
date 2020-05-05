import React, { useState } from "react";
import { useService } from "@xstate/react";

import { GameBoard, GameBoardProps } from "./GameBoard";
import RoleBtns from "./RoleBtns";
import ConnectGroup from "./ConnectGroup";
import StateMessage from "./StateMessage";
import NewGameButton from "./NewGameButton";
import {
    ClientEvent,
    ClientContext
} from "../state-machine/state-machine-schema";
import { SocketedInterpreter } from "../state-machine/state-machine";

import styles from "./Game.module.css";

// TODO: generalize
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

    // persisting instance in the state, so it is not recreated on
    // every render
    const [interpr] = useState(
        new SocketedInterpreter(props.game_host_uri, setBoard)
    );
    if (!interpr.initialized) {
        // to prevent reinitilization during re-rendering
        interpr.start();
    }
    const [state, send] = useService<ClientContext, ClientEvent>(interpr);

    // FIXME: submitting incorrect move (occupied cells)
    const cellClicked = (row, column) => {
        console.log(`clicked ${row} - ${column}`);
        if (!state.matches("game.our_turn")) {
            return;
        }

        state.context.socket.emit("move", { row, column });
    };

    const chooseRole = role => {
        console.log("Requested to be " + role);
        send({ type: "ROLE_PICKED", role });
    };

    const newGameClick = () => {
        setBoard(initialBoard);
        interpr.raise_new_game(playerId);
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
                                    interpr.raise_player_connect(playerId);
                                }}
                            />
                            <RoleBtns
                                disabled={!state.matches("role_picking")}
                                chooseRole={chooseRole}
                            />
                            {state.matches("end") && (
                                <NewGameButton onClick={newGameClick} />
                            )}
                        </form>
                    </div>
                </div>
            </section>
        </>
    );
};
export default Game;
