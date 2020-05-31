import React from "react";

import { PopBanner } from "./PopBanner";

interface P {
    onConfirm: () => void;
    style?: React.StyleHTMLAttributes<HTMLButtonElement>;
}

export const QuitButton: React.FC<P> = props => {
    const [pressed, setPressed] = React.useState(false);

    return pressed ? (
        <PopBanner
            title="Give up"
            mode="alert"
            backdrop
            onBackdropClick={() => setPressed(false)}
        >
            <p className="m-2">Are you sure about this, chief?</p>
            <button
                type="button"
                className="btn btn-blue"
                onClick={() => setPressed(false)}
            >
                Nope
            </button>
            <button
                type="button"
                className="btn btn-red ml-4"
                onClick={props.onConfirm}
            >
                Yep
            </button>
        </PopBanner>
    ) : (
        <button
            type="button"
            className="btn btn-red absolute"
            style={Object.assign(
                {},
                { top: "6rem", right: "1rem" },
                props.style
            )}
            onClick={() => setPressed(true)}
        >
            I give up!
        </button>
    );
};
