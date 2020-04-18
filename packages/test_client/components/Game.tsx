import io from "socket.io-client";
import React, { useState } from "react";
import { interpret } from "xstate";
import { useMachine } from "@xstate/react";

import GameBoard from "./GameBoard";
import RoleBtns from "./RoleBtns";
import ConnectGroup from "./ConnectGroup";
import { clientMachine } from "../state-machine/state-machine";

// TODO: generalize
interface P {
    game_host_uri: string;
}

export const Game: React.FC<P> = props => {
    const [socket, setSocket] = useState(null);
    const [gameId, setGameId] = useState(null);
    const [playerId, setPlayerId] = useState(null);
    const [board, setBoard] = useState([Array(3), Array(3), Array(3)]);
    const [state, send] = useMachine(clientMachine);

    let sm = "???";
    switch (true) {
        case state.matches("initial"):
            sm = "Ready to connect to the game";
            break;
        case state.matches("role_picking"):
            sm = "Choose your destiny!";
            break;
        case state.matches("waiting4opponent"):
            sm = "Waiting for the slowpoke to join...";
            break;
        case state.matches("game.our_turn"):
            sm = "Your turn! Destroy them!";
            break;
        case state.matches("game.their_turn"):
            sm = "Enemy is trying to not lose...";
            break;
        case state.matches("end_draw"):
            sm = "You spared him, how noble.";
            break;
        case state.matches("end_defeat"):
            sm = "... he probably cheated :-\\";
            break;
        case state.matches("end_victory"):
            sm = "As expected, you are the best";
            break;
    }

    const btnConnect = (playerId: string) => {
        console.log("New game button pressed");

        if (!playerId) {
            alert("Players' ids must be set!");
            // this.setState({
            //     statusMessage: "Players' ids must be set!"
            // });
            return;
        }

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

            socket.once("choose_role", () => s_choose_role());
            // socket.once("reconnection", data => this.s_reconnection(data));
        }
    };

    const cellClicked = (row, column) => {
        console.log(`clicked ${row} - ${column}`);
        if (!state.matches("game.our_turn")) {
            return;
        }

        socket.emit("move", { row, column });
    };

    // // reconnect to an existing game
    // s_reconnection(data) {
    //     this.setState({
    //         gameId: data.gameId,
    //         step: data.step,
    //         board: data.board,
    //         statusMessage:
    //             data.step === "my-turn"
    //                 ? "Your turn! Destroy them!"
    //                 : "Enemy is trying to not lose..."
    //     });
    //     this.state.socket.on("your_turn", () => this.s_your_turn());
    //     this.state.socket.on("meme_accepted", data =>
    //         this.s_meme_accepted(data)
    //     );
    //     this.state.socket.on("opponent_moved", data =>
    //         this.s_opponent_moved(data)
    //     );
    //     this.state.socket.on("gameover", data => this.s_gameover(data));
    // }

    // received 'choose_role' message
    const s_choose_role = () => {
        console.log("Got choose_role");
        send({
            type: "CONNECTED"
        });
    };

    const s_iamalreadytracer = () => {
        console.log("Role will be assigned by coin toss...");
    };

    const s_you_are_it = (role: "first" | "second") => {
        console.log("Received role, we are " + role);
        send({ type: "GAME_START", role });
        socket.on("your_turn", () => s_your_turn());
        socket.on("meme_accepted", data => s_meme_accepted(data));
        socket.on("opponent_moved", data => s_opponent_moved(data));
        socket.on("gameover", data => s_gameover(data));
    };

    const s_your_turn = () => {
        console.log("its my turn!");
    };

    const s_meme_accepted = response => {
        console.log("my move was accepted!");
        console.log(response);
        send({ type: "NEXT_TURN" });
        setBoard(response.board);
    };

    const s_opponent_moved = response => {
        console.log("opponent made his move");
        console.log(response);
        send({ type: "NEXT_TURN" });
        setBoard(response.board);
    };

    const s_gameover = data => {
        console.log("it seems the game is over");
        console.log(data);
        send({
            type: "GAME_END",
            outcome: data.winner
                ? data.winner == playerId
                    ? "win"
                    : "fail"
                : "meh"
        });
    };

    const btnRole = role => {
        console.log("Requested to be " + role);
        socket.emit("iwannabetracer", role);
        send({ type: "ROLE_PICKED" });
        socket.once("iamalreadytracer", () => s_iamalreadytracer());
        socket.once("you_are_it", role => s_you_are_it(role));
    };

    const statusMessage = sm;
    return (
        <>
            <section className="content">
                <div id="game">
                    <GameBoard
                        board={board}
                        onCellClick={(i, j) => cellClicked(i, j)}
                    />
                    <h1>{statusMessage}</h1>
                </div>
                <div id="controls" className="container-fluid">
                    <div className="row">
                        <form className="col">
                            <ConnectGroup
                                disabled={!state.matches("initial")}
                                connectBtn={btnConnect}
                            ></ConnectGroup>
                            <RoleBtns
                                disabled={!state.matches("role_picking")}
                                btnClick={btnRole}
                            ></RoleBtns>
                        </form>
                    </div>
                </div>
            </section>
            <style jsx global>{`
                #page {
                    background-color: bisque;
                    position: absolute;
                    top: 0;
                    bottom: 0;
                    left: 0;
                    right: 0;
                }

                section.content {
                    height: 100%;
                    display: flex;
                    align-content: stretch;
                }
                #game {
                    width: 70%;
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: center;
                    align-items: center;
                    align-content: center;
                    /* height: 100%; */
                }
                #game h1 {
                    width: 100%;
                    text-align: center;
                }
                #controls {
                    background-color: darkkhaki;
                    width: 30%;
                }
                #controls .row {
                    align-items: center;
                    height: 100%;
                }
                #step-role {
                    margin: 2em 0;
                }
                #step-role button {
                    margin-right: 1em;
                }
            `}</style>
        </>
    );
};
export default Game;
