import React from "react";

interface P {
    title?: string;
}

export const PopBanner: React.FC<React.PropsWithChildren<P>> = props => {
    // bg-opacity-75 border-opacity-75 text-opacity-75
    return (
        <div className="fixed w-screen h-screen flex flex-col left-0 top-0 b justify-center pointer-events-none">
            <div
                className={`
                    bg-blue-100 border-t-4 border-b-4 border-blue-500
                    text-blue-700 px-4 py-3 opacity-75 text-center
                    py-1 flex flex-col pointer-events-auto
                `}
                style={{
                    zIndex: 100,
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
