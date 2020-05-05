import React from "react";

interface P {
    onClick: () => void;
}

export const NewGameButton: React.FC<P> = ({ onClick }) => (
    <button type="button" className="btn btn-primary" onClick={onClick}>
        Another Game
    </button>
);

export default NewGameButton;
