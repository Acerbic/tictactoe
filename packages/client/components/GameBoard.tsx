import React, { useRef, CSSProperties } from "react";
import { useSpring, animated, UseSpringProps } from "react-spring";

import GameBoardCell from "./GameBoardCell";

import styles from "./GameBoard.module.css";

const calc = (
    x: number,
    y: number,
    ref: React.MutableRefObject<HTMLDivElement | null>
): [number, number, number] => {
    const rect = ref.current!.getBoundingClientRect();
    const [cx, cy] = [rect.left + rect.width / 2, rect.top + rect.height / 2];
    return [-(y - cy) / 20, (x - cx) / 20, 1.1];
};
const trans = (x: number, y: number, s: number) => {
    return `perspective(600px) rotateX(${x}deg) rotateY(${y}deg) scale(${s})`;
};

export interface GameBoardProps {
    board: [
        [string | null, string | null, string | null],
        [string | null, string | null, string | null],
        [string | null, string | null, string | null]
    ];
    onCellClick: (i: number, j: number) => void;
}

// extracting argument to useSpring as a named function to help TS resolve
// overload of useSpring call. (Between useSpring(object) and
// useSpring(Function))
type SpringData = {
    xys: [number, number, number];
};
const springInitGen = () =>
    ({
        xys: [0, 0, 1],
        config: { mass: 5, tension: 350, friction: 40 }
    } as UseSpringProps<SpringData & CSSProperties>);

export const GameBoard: React.FC<GameBoardProps> = ({ board, onCellClick }) => {
    // hackity-hacks because react-spring typedefs are incorrect
    const ref = useRef<
        HTMLDivElement
    >() as React.MutableRefObject<HTMLDivElement | null>;

    const [springProp, setSpringProp] = useSpring<SpringData>(springInitGen);
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
                        cellTokenPlayerId={board[i][j]}
                    ></GameBoardCell>
                ))
            )}
        </animated.div>
    );
};

export default GameBoard;
