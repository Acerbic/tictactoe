import React from "react";

interface GameBoardProps {
    board: Array<Array<string>>;
    onCellClick: (i: number, j: number) => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({ board, onCellClick }) => (
    <div id="board">
        {[0, 1, 2].map(i =>
            [0, 1, 2].map(j => (
                <div
                    key={`${i}${j}`}
                    data-row={i}
                    data-column={j}
                    className="board-cell"
                    onClick={() => onCellClick(i, j)}
                >
                    {board[i][j]}
                </div>
            ))
        )}
        <style jsx global>{`
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
);

export default GameBoard;
