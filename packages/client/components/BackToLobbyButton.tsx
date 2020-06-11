import React from "react";

interface P {
    onClick: () => void;
    style?: React.CSSProperties;
}

export const BackToLobby: React.FC<P> = ({ onClick, style }) => (
    <button
        type="button"
        className="btn btn-blue"
        onClick={onClick}
        style={style}
    >
        Back to Lobby
    </button>
);

export default BackToLobby;
