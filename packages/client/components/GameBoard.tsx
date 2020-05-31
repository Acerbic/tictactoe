import React from "react";

import { GameBoard as GameBoardDataType } from "@trulyacerbic/ttt-apis/ghost-api";

import Card3D from "./react-spring/Card3D";
import GameBoardCell from "./GameBoardCell";

export interface GameBoardProps {
    board: GameBoardDataType;
    onCellClick: (i: number, j: number) => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({ board, onCellClick }) => {
    return (
        <Card3D>
            <div
                className="w-full h-full grid grid-rows-3 grid-cols-3"
                style={{ gap: "5% 5%" }}
            >
                {board.map((row, i) =>
                    row.map((id, j) => (
                        <GameBoardCell
                            key={`${i}-${j}`}
                            onClick={() => onCellClick(i, j)}
                            cellTokenPlayerId={id}
                        ></GameBoardCell>
                    ))
                )}
            </div>
        </Card3D>
    );
};

export default GameBoard;
