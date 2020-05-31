import React from "react";

interface P {
    onClick: () => void;
    style?: React.CSSProperties;
}

export const NewGameButton: React.FC<P> = ({ onClick, style }) => (
    <button
        type="button"
        className="btn btn-blue"
        onClick={onClick}
        style={style}
    >
        Another Game?
    </button>
);

export default NewGameButton;
