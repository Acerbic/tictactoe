import React, { useRef } from "react";
import { useSpring, animated } from "react-spring";

import GameBoardCell from "./GameBoardCell";

import styles from "./GameBoard.module.css";

const calc = (x, y, ref: React.MutableRefObject<HTMLElement>) => {
    const rect = ref.current.getBoundingClientRect();
    const [cx, cy] = [rect.left + rect.width / 2, rect.top + rect.height / 2];
    return [-(y - cy) / 20, (x - cx) / 20, 1.1];
};
const trans = (x, y, s) => {
    return `perspective(600px) rotateX(${x}deg) rotateY(${y}deg) scale(${s})`;
};

export interface GameBoardProps {
    board: [
        [string?, string?, string?],
        [string?, string?, string?],
        [string?, string?, string?]
    ];
    onCellClick: (i: number, j: number) => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({ board, onCellClick }) => {
    const ref = useRef();

    const [springProp, setSpringProp] = useSpring(() => ({
        xys: [0, 0, 1],
        config: { mass: 5, tension: 350, friction: 40 }
    }));
    return (
        <animated.div
            id={styles.board}
            ref={ref}
            onMouseMove={({ clientX: x, clientY: y }) =>
                setSpringProp({ xys: calc(x, y, ref) })
            }
            onMouseLeave={() => setSpringProp({ xys: [0, 0, 1] })}
            style={{ transform: springProp.xys.interpolate(trans as any) }}
        >
            {[0, 1, 2].map(i =>
                [0, 1, 2].map(j => (
                    <GameBoardCell
                        key={`${i}${j}`}
                        onClick={() => onCellClick(i, j)}
                    >
                        {board[i][j]}
                    </GameBoardCell>
                ))
            )}
        </animated.div>
    );
};

export default GameBoard;
