/**
 * UI pop element that covers primary game field to interact with the player or
 * inform them of some "meta" events, like disconnections or errors
 */

import React from "react";

interface P {
    title?: string;

    // control color scheme and possibly decorations
    mode?: "regular" | "alert";

    // should backdrop be clickable?
    backdrop?: boolean;
    onBackdropClick?: (e: React.MouseEvent) => void;
}

export const PopBanner: React.FC<React.PropsWithChildren<P>> = props => {
    const mode = props.mode ?? "regular";
    const backdropRef = React.useRef(null);

    const modeColors = {
        regular: "bg-blue-100 border-blue-500 text-blue-700 opacity-75",
        alert: "bg-red-200 border-red-500 text-gray-800 opacity-50"
    };

    const backDropVariant = props.backdrop
        ? "bg-gray-700 bg-opacity-50"
        : "pointer-events-none";
    const contentVariant =
        modeColors[mode] + (props.backdrop ? "" : " pointer-events-auto");

    return (
        <div
            ref={backdropRef}
            className={`
                fixed w-screen h-screen flex flex-col left-0 top-0
                justify-center ${backDropVariant}`}
            style={{ zIndex: 100 }}
            onClick={e => {
                // prevent leaking PoPBanner contents body clicks to onBackdropClick handler
                if (e.target === backdropRef.current) {
                    props.onBackdropClick?.(e);
                }
            }}
        >
            <div
                className={`
                    border-t-4 border-b-4 px-4 py-3 text-center flex flex-col ${contentVariant}
                `}
                style={{
                    opacity: 0.85,
                    minHeight: "12rem"
                }}
                role="alert"
            >
                {props.title && (
                    <h3 className="font-bold text-2xl">{props.title}</h3>
                )}
                <div className="flex-1 flex items-center justify-center ">
                    <div>{props.children}</div>
                </div>
            </div>
        </div>
    );
};

export default PopBanner;
