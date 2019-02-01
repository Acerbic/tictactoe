import 'bootstrap/dist/css/bootstrap.min.css'
import React from 'react'
import io from 'socket.io-client'

import GameBoard from '../components/GameBoard'
const game_host_uri = 'http://localhost:3060';

export default class TestPage extends React.Component {
    constructor (props) {
        super(props);

        this.state = {
            socket: null,
            gameId: null,
            playerId: null,
            board: Array(Array(3), Array(3), Array(3)),
            currentPlayer: 'player1',
            step: 'initial',
            statusMessage: "Ready to connect to the game"
        }
    }

    btnConnect() {
        console.log('New game button pressed');
        const playerId = document.getElementsByName("pid")[0].value;
        if (!playerId) {
            // alert("Players' ids must be set!");
            this.setState({
                statusMessage: "Players' ids must be set!"
            });
            return;
        }

        this.setState({
            gameId: null,
            playerId,
            step: 'wait4start',
            statusMessage: "Connecting..."
        });

        (async () => {
            console.log('Opening socket');
            const socket = io(game_host_uri, {
                timeout: 20000000,
                reconnection: false,
                query: {
                    playerId
                }
            });
            if (!socket) {
                console.error('Failed to open a socket');
            } else {
                console.log("Opened socket");
                this.setState({socket});

                socket.once('choose_role', () => this.s_choose_role());
            }
        })();
    }

    cellClicked(row, column) {
        console.log(`clicked ${row} - ${column}`);
        if (this.state.step !== 'my-turn') {
            return;
        }

        this.state.socket.emit('move', {row, column});
        this.setState({step: 'meme_review', statusMessage: "Move sent."});
    }

    // received 'choose_role' message
    s_choose_role() {
        console.log('Got choose_role');
        this.setState({step: 'role-pick', statusMessage: "Choose your destiny!"});
    }

    s_iamalreadytracer() {
        console.log('Role will be assigned by coin toss...');
        this.setState({step: 'forced_role'});
    }

    s_you_are_it(role) {
        console.log("Received role, we are " + role);
        if (role == 'first') {
            this.setState({step: 'ready'});
        } else {
            this.setState({step: 'opponents-turn', statusMessage: "Enemy is trying to not lose..."});
        }
        this.state.socket.on('your_turn', () => this.s_your_turn());
        this.state.socket.on('meme_accepted', (data) => this.s_meme_accepted(data));
        this.state.socket.on('opponent_moved', (data) => this.s_opponent_moved(data));
        this.state.socket.on('gameover', (data) => this.s_gameover(data));
    }

    s_your_turn() {
        console.log("its my turn!");
        this.setState({step: 'my-turn', statusMessage: "Your turn! Destroy them!"});
    }

    s_meme_accepted(response) {
        console.log("my move was accepted!");
        console.log(response);
        this.setState({step: 'opponents-turn', board: response.board, statusMessage: "Enemy is trying to not lose..."});
    }

    s_opponent_moved(response) {
        console.log("opponent made his move");
        console.log(response);
        this.setState({step: 'ready', board: response.board});
    }

    s_gameover(data) {
        console.log("it seems the game is over");
        console.log(data);
        let statusMessage = "";
        if (data.winner) {
            if (data.winner == this.state.playerId) {
                statusMessage = "As expected, you are the best";
            } else {
                statusMessage = "... he probably cheated :-\\";
            }
        } else {
            statusMessage = "You spared him, how noble.";
        }
        this.setState({step: 'game-over', statusMessage});
    }

    btnRole( role ) {
        console.log("Requested to be " + role);
        this.setState({step: 'wait4game', statusMessage: "Waiting for that slowpoke to join.."});
        this.state.socket.emit('iwannabetracer', role);
        this.state.socket.once('iamalreadytracer', () => this.s_iamalreadytracer());
        this.state.socket.once('you_are_it', (role) => this.s_you_are_it(role));
    }

    render() {
        return <div id="page">
            <section className="content">
                <div id="game">
                    <GameBoard board={this.state.board} onCellClick={
                        (i, j) => this.cellClicked(i, j) } />
                    <h1>{this.state.statusMessage}</h1>
                </div>
                <div id="controls" className="container-fluid">
                    <div className="row">
                        <form className="col">
                            <div>
                                <div className="form-group">
                                    <label htmlFor="pid">Player id</label>
                                    <input className="form-control" name="pid"
                                        disabled={ (this.state.step == 'initial' ? null : true) }
                                    ></input>
                                </div>
                                <button id="btnConnect" type="button" className="btn btn-primary" 
                                    disabled={ (this.state.step == 'initial' ? null : true) }
                                    onClick={() => this.btnConnect()}>
                                    Connect
                                </button>
                            </div>
                            <div id="step-role">
                                <button id="btnFirst" type="button" className="btn btn-primary" 
                                    disabled={ (this.state.step == 'role-pick' ? null : true) }
                                    onClick={() => this.btnRole('first')}>
                                    First
                                </button>
                                <button id="btnSecond" type="button" className="btn btn-primary"
                                    disabled={ (this.state.step == 'role-pick' ? null : true) }
                                    onClick={() => this.btnRole('second')}>
                                    Second
                                </button>
                            </div>
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
                    width: 30%
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
        </div>
    }

}