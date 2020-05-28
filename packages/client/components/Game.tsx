import React, { useState } from "react";
import { useRecoilValue, useRecoilState } from "recoil";
import { useMachine } from "@xstate/react";

import { GameBoard, GameBoardProps } from "./GameBoard";
import RoleBtns from "./RoleBtns";
import { Btn } from "./Btn";
import ConnectGroup from "./ConnectGroup";
import StateMessage from "./StateMessage";
import NewGameButton from "./NewGameButton";
import { PopBanner } from "./PopBanner";

import { clientMachine } from "../state-machine/state-machine";
import { SocketGameConnector } from "../state-machine/SocketGameConnector";
import { playerState, roleSelectedState } from "../state-defs";

import styles from "./Game.module.css";

interface P {
    game_host_url: string;
}

const initialBoard: GameBoardProps["board"] = [
    [null, null, null],
    [null, null, null],
    [null, null, null]
];

export const Game: React.FC<P> = props => {
    // const [gameId, setGameId] = useState(null);

    const [player, setPlayer] = useRecoilState(playerState);
    const [roleSelected, setRoleSelected] = useRecoilState(roleSelectedState);
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
        setRoleSelected(role);
    };

    const startNewGame = () => {
        setBoard(initialBoard);

        // initiate new connection to game server
        const con = new SocketGameConnector(
            props.game_host_url,
            setBoard,
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
        setPlayer(null);
        send({ type: "UI_RESET" });
    };

    let stateRendered: JSX.Element[] = [];
    switch (true) {
        case !player:
            stateRendered = [
                <PopBanner>Sorry, need to login to play.</PopBanner>
            ];
            break;
        case state.matches("initial"):
            stateRendered = [
                <PopBanner title="Do you want to play a game? o^_^o">
                    <Btn onClick={startNewGame}>Yes</Btn>
                </PopBanner>
            ];
            break;
        case state.matches("awaiting_connection"):
            stateRendered = [<StateMessage state={state} />];
            break;

        case state.matches("role_picking"):
            stateRendered = [
                <PopBanner title="Pick wisely!">
                    <h3 className="text-xl mb-3">Who you gonna be?</h3>
                    <Btn onClick={() => chooseRole("first")} className="mx-3">
                        Bass
                    </Btn>
                    <Btn onClick={() => chooseRole("second")} className="mx-3">
                        Base
                    </Btn>
                </PopBanner>
            ];
            break;

        case state.matches("waiting4opponent"):
            stateRendered = [
                <PopBanner>... waiting for opponent to join...</PopBanner>
            ];

        default:
            stateRendered = [
                <GameBoard board={board} onCellClick={cellClicked} />,
                <h1>
                    <StateMessage state={state} />
                </h1>
            ];
    }

    return (
        <section className="flex items-center justify-center h-full">
            <div className="flex-none">{stateRendered}</div>
            {/* <div id={styles.controls} className="container-fluid">
                    <div className="row">
                        <div className="col">
                            <ConnectGroup
                                playerId={playerId}
                                setPlayerId={setPlayerId}
                                connected={!state.matches("initial")}
                                connectBtn={startNewGame}
                                disconnectBtn={dropGameConnection}
                            />
                            {state.matches("role_picking") && (
                                <RoleBtns
                                    disabled={!state.matches("role_picking")}
                                    chooseRole={chooseRole}
                                />
                            )}
                            {state.matches("end") && (
                                <NewGameButton onClick={startNewGame} />
                            )}
                        </div>
                    </div>
                </div> */}
        </section>
    );
};
export default Game;
