import io from "socket.io-client";
import React, { useState } from "react";
import { useMachine } from "@xstate/react";

import { GameBoard, GameBoardProps } from "./GameBoard";
import RoleBtns from "./RoleBtns";
import ConnectGroup from "./ConnectGroup";
import StateMessage from "./StateMessage";
import NewGameButton from "./NewGameButton";
import { clientMachine } from "../state-machine/state-machine";
import { attachListeners } from "./socket_handlers";

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
    const [socket, setSocket] = useState<SocketIOClient.Socket>(null);
    // const [gameId, setGameId] = useState(null);
    const [playerId, setPlayerId] = useState(null);
    const [board, setBoard] = useState(initialBoard);
    const [state, send] = useMachine(clientMachine);

    const openSocket2Ghost = (playerId: string) => {
        setPlayerId(playerId);

        console.log("Opening socket");
        const socket = io(props.game_host_uri, {
            timeout: 20000000,
            reconnection: false,
            query: {
                playerId
            }
        });
        if (!socket) {
            console.error("Failed to open a socket");
        } else {
            console.log("Opened socket");
            setSocket(socket);

            attachListeners(socket, send, playerId, setBoard);
        }
    };

    const cellClicked = (row, column) => {
        console.log(`clicked ${row} - ${column}`);
        if (!state.matches("game.our_turn")) {
            return;
        }

        socket.emit("move", { row, column });
    };

    const chooseRole = role => {
        console.log("Requested to be " + role);
        socket.emit("iwannabetracer", role);
        send({ type: "ROLE_PICKED" });
    };

    const newGameClick = () => {
        socket.close();
        setBoard(initialBoard);
        setSocket(null);
        send({
            type: "NEW_GAME"
        });
        openSocket2Ghost(playerId);
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
                                    send({
                                        type: "CONNECTION_INITIATED"
                                    });
                                    openSocket2Ghost(playerId);
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
