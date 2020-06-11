import React, { SyntheticEvent } from "react";

interface P {
    onClick: (e?: SyntheticEvent<HTMLButtonElement, MouseEvent>) => void;
    style?: React.CSSProperties;
}

export const Button: React.FC<P> = props => (
    <button
        type="button"
        className="btn btn-blue"
        onClick={props.onClick}
        style={props.style}
    >
        {props.children}
    </button>
);

export default Button;
