import React from "react";

interface P {
    title?: string;
}

export const PopBanner: React.FC<React.PropsWithChildren<P>> = props => {
    // bg-opacity-75 border-opacity-75 text-opacity-75
    return (
        <div
            className={
                "bg-blue-100 border-t-4 border-b-4 border-blue-500 text-blue-700" +
                " px-4 py-3 opacity-75 fixed w-screen text-center" +
                " py-1 flex flex-col"
            }
            style={{
                zIndex: 100,
                height: "50%",
                top: "25%",
                left: 0,
                right: 0,
                opacity: 0.85
            }}
            role="alert"
        >
            {props.title && <p className="font-bold text-2xl">{props.title}</p>}
            <div className="flex-1 flex items-center justify-center ">
                <div>{props.children}</div>
            </div>
        </div>
    );
};

export default PopBanner;
