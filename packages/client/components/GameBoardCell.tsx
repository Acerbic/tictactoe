import React from "react";
import { useRecoilValue } from "recoil";

import { playerState, roleSelectedState } from "../state-defs";

import styles from "./GameBoard.module.css";

interface P {
    onClick: () => void;
    cellTokenPlayerId: string | null;
}

const GameBoardCell: React.FC<P> = props => {
    const player = useRecoilValue(playerState);
    const roleSelected = useRecoilValue(roleSelectedState);

    const opponentRole: "first" | "second" =
        roleSelected === "first" ? "second" : "first";

    const cellRole: "first" | "second" | null =
        props.cellTokenPlayerId === null
            ? null
            : props.cellTokenPlayerId === player!.id
            ? roleSelected!
            : opponentRole;

    const cellContents = cellRole && (cellRole === "first" ? "𝕏" : "𐌏");

    return (
        <div
            className={styles["board-cell"] + " leading-16"}
            onClick={props.onClick}
        >
            <span className="text-3xl align-middle">{cellContents}</span>
        </div>
    );
};

export default GameBoardCell;
