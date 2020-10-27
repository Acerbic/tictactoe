/**
 * React-spring wrapper to minimize and fade a div over a short period of time
 * after holding it visible until a signal.
 *
 * When Hold is true, the animation retains original position and scaling
 *           is false, the content is faded out and minimize towards top-right
 * When Reset is true, the animation is snapped towards full "Hold" state
 * When Hidden is true, "display: none" CSS is applied
 */

import React from "react";
import { useSpring, animated } from "react-spring";

interface P {
    hold: boolean;
    hidden: boolean;
    reset: boolean;
}

export const FadeMinimize: React.FC<P> = ({
    hold,
    hidden,
    reset,
    children
}) => {
    const { transform, opacity } = useSpring({
        transform: hold
            ? "translate(0%, 0%) scale(1)"
            : "translate(50%, -50%) scale(0.35)",
        opacity: hold ? 1 : 0,
        from: {
            transform: "translate(0%, 0%) scale(1)",
            opacity: 1
        },
        reset
    });

    return (
        <animated.div
            className="fixed left-0 top-0 h-full w-full"
            style={{
                transform,
                opacity,
                zIndex: 10,
                pointerEvents: hold ? "unset" : "none",
                display: hidden ? "none" : undefined
            }}
        >
            {children}
        </animated.div>
    );
};
