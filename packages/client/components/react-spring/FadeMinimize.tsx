/**
 * React-spring wrapper to minimize and fade a div over a short period of time
 * after holding it visible until a signal
 */

import React from "react";
import { useSpring, animated } from "react-spring";

interface P {
    hold: boolean;
    hidden: boolean;
}

export const FadeMinimize: React.FC<P> = ({ hold, hidden, children }) => {
    const { transform, opacity } = useSpring({
        transform: hold
            ? "translate(0%, 0%) scale(1)"
            : "translate(50%, -50%) scale(0.35)",
        opacity: hold ? 1 : 0,
        from: {
            transform: "translate(0%, 0%) scale(1)",
            opacity: 1
        },
        reset: hold
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
