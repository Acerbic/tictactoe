import React from "react";
import styles from "./GameBoard.module.css";

export interface GameBoardProps {
    board: [
        [string?, string?, string?],
        [string?, string?, string?],
        [string?, string?, string?]
    ];
    onCellClick: (i: number, j: number) => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({ board, onCellClick }) => (
    <div id={styles.board}>
        {[0, 1, 2].map(i =>
            [0, 1, 2].map(j => (
                <div
                    key={`${i}${j}`}
                    data-row={i}
                    data-column={j}
                    className={styles["board-cell"]}
                    onClick={() => onCellClick(i, j)}
                >
                    {board[i][j]}
                </div>
            ))
        )}
    </div>
);

export default GameBoard;
