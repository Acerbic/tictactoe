/**
 * Container with 3D spring effect animation
 * @see https://codesandbox.io/embed/rj998k4vmm
 */

import React, { useRef, CSSProperties } from "react";
import { useSpring, animated, UseSpringProps } from "react-spring";

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

type SpringData = {
    xys: [number, number, number];
};
const springInitGen = () =>
    ({
        xys: [0, 0, 0.1],
        config: { mass: 5, tension: 350, friction: 40 }
    } as UseSpringProps<SpringData & CSSProperties>);

export const Card3D: React.FC = ({ children }) => {
    // FIXME: hackity-hacks because react-spring typedefs are incorrect
    const ref = useRef<
        HTMLDivElement
    >() as React.MutableRefObject<HTMLDivElement | null>;

    const [springProp, setSpringProp] = useSpring<SpringData>(springInitGen);
    React.useEffect(() => {
        setSpringProp({ xys: [0, 0, 1] });
    }, []);

    return (
        <animated.div
            ref={ref}
            onMouseMove={({ clientX: x, clientY: y }) =>
                setSpringProp({ xys: calc(x, y, ref) })
            }
            onMouseLeave={() => setSpringProp({ xys: [0, 0, 1] })}
            style={{ transform: springProp.xys.interpolate(trans as any) }}
        >
            {children}
        </animated.div>
    );
};

export default Card3D;
