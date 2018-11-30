import 'bootstrap/dist/css/bootstrap.min.css'
import React from 'react'
import fetch from 'isomorphic-unfetch'
import GameMachine from '../../gmaster/game/game-machine'

export default class TestPage extends React.Component {
    constructor (props) {
        super(props);

        this.state = {
            gameId: null,
            board: Array(Array(3), Array(3), ["a", "b", "c"]),
            currentPlayer: 'player1',
        }
    }

    async CallServer( endpoint, payload ) {
        const res = await fetch('http://localhost:3000/' + endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        return res.json();
    }

    btnNewGame() {
        const player1Id = document.getElementsByName("p1_id")[0].value;
        const player2Id = document.getElementsByName("p2_id")[0].value;
        if (! (player1Id && player2Id)) {
            alert("Players' ids must be set!");
            return;
        }

        this.setState({gameId: null});

        (async () => {
            const data = await this.CallServer('CreateGame', { player1Id, player2Id });
            if (data.success) {
                console.log("New Game Id = ", data.gameId);
                let new_state = {
                    gameId: data.gameId,
                    board: Array(Array(3), Array(3), Array(3)),
                    currentPlayer: 'player1',
                }
                this.setState(new_state);
            } else {
                console.log("ERROR! " + data.errorMessage);
            }
        })();
    }

    cellClicked(row, column) {
        console.log(`clicked ${row} - ${column}`);

        const playerId = document.getElementsByName("switch")[0].value == 'player_1' ?
            document.getElementsByName("p1_id")[0].value :
            document.getElementsByName("p2_id")[0].value;

        (async () => {
            const data = await this.CallServer(
                'MakeMove/' + this.state.gameId,
                {
                    playerId,
                    move: { row, column }
                }
            );
            if (data.success) {

                this.state.board[row][column] = document.getElementsByName("switch")[0].value == 'player_1' ?
                    'X' : 'O';

                this.setState({
                    board: this.state.board
                });
                console.log("Move Success!", data.newState );
            } else {
                console.log("ERROR! " + data.errorMessage);
            }
        })();
    }

    render() {
        return <div id="page">
            <section className="content">
                <div id="game">
                    <div id="board">
                    {
                        [0, 1, 2].map( i =>
                            [0, 1, 2].map( j => 
                                <div 
                                    key={ `${i}${j}` } 
                                    data-row={ i } 
                                    data-column={ j }
                                    className="board-cell"
                                    onClick={ () => this.cellClicked(i, j) }
                                >
                                { this.state.board[i][j] }
                                </div>
                            )
                        )
                    }
                    </div>
                    <p ref="status"></p>
                </div>
                <div id="controls" className="container-fluid">
                    <div className="row">
                        <form className="col">
                            <div className="form-group">
                                <label htmlFor="p1_id">Player 1 id</label>
                                <input className="form-control" name="p1_id"></input>
                            </div>
                            <div className="form-group">
                                <label htmlFor="p2_id">Player 2 id</label>
                                <input className="form-control" name="p2_id"></input>
                            </div>
                            <div className="form-group">
                                <label htmlFor="switch">Select player</label>
                                <select className="form-control" name="switch">
                                    <option value="player_1">Player 1</option>
                                    <option value="player_2">Player 2</option>
                                </select>
                            </div>
                            <button type="button" className="btn btn-primary" onClick={ () => this.btnNewGame() }>New Game</button>
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
                    justify-content: center;
                    align-items: center;
                    /* height: 100%; */
                }
                #controls {
                    background-color: darkkhaki;
                    width: 30%
                }
                #controls .row {
                    align-items: center;
                    height: 100%;
                }
                #board {
                    transform: perspective(1000px) rotateY(15deg);                
                    width: 14em;
                    height: 14em;
                    justify-content: space-around;
                    display: flex;
                    flex-wrap: wrap;
                }
                .board-cell {
                    flex-grow: 0;
                    height: 4em;
                    width: 4em;
                    border: solid 3px darkslategrey;
                    box-sizing: border-box;
                    line-height: 3em;
                    text-align: center;
                }
            `}</style>
        </div>
    }

}