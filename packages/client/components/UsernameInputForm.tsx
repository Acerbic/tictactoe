/**
 * A screen for player to input the name
 */

import React, { useState } from "react";

import styles from "./UsernameInputForm.module.css";

interface P {
    initialValue: string;
    onSaveClick: (newName: string) => void;
    onCancelClick: () => void;
    isFormClosing?: boolean;
}

// Not part of component state to eliminate extra revalidations
// As a trade-off, this React Component must be used as a singleton
let dragOrigin: EventTarget | null = null;
let dragEnd: EventTarget | null = null;

export const UsernameInputForm: React.FC<P> = props => {
    // because name is only being read on state initialization, there's no
    // reactive dependency i.e. even if during form operation underlying
    // playerAuthState.name changes, the form will not lose its input field
    // value
    const [newName, setNewName] = useState<string>(props.initialValue);

    const backdropClick = (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
        if (e.target === e.currentTarget && dragEnd === dragOrigin) {
            e.stopPropagation();
            e.preventDefault();
            props.onCancelClick();
        }
        dragOrigin = null;
        dragEnd = null;
    };

    return (
        <div
            className={`${styles.root} ${
                props.isFormClosing ? styles.closing : ""
            }`}
            onClick={backdropClick}
            onMouseDown={e => (dragOrigin = e.target)}
            onMouseUp={e => (dragEnd = e.target)}
        >
            <div className="content">
                <h1>Your name is....</h1>
                <input
                    type="text"
                    onChange={e => setNewName(e.target.value)}
                    value={newName}
                ></input>
                <div className="buttons">
                    <input
                        type="button"
                        onClick={props.onCancelClick}
                        value="Cancel"
                    />
                    <input
                        type="submit"
                        onClick={() => props.onSaveClick(newName)}
                        value="Save"
                    />
                </div>
            </div>
        </div>
    );
};
export default UsernameInputForm;
