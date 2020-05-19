import React from "react";
import styles from "./GameBoard.module.css";

interface P {
    onClick: () => void;
}

const GameBoardCell: React.FC<P> = props => (
    <div className={styles["board-cell"]} onClick={props.onClick}>
        {props.children}
    </div>
);

export default GameBoardCell;
