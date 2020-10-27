/**
 * A screen for player to input their name
 */

import React, { useEffect, useState } from "react";

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
    useEffect(() => {
        setNewName(props.initialValue);
    }, [props.initialValue]);

    const cancel = () => {
        setNewName(props.initialValue);
        props.onCancelClick();
    };

    const backdropClick = (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
        if (e.target === e.currentTarget && dragEnd === dragOrigin) {
            e.stopPropagation();
            e.preventDefault();
            cancel();
        }
        dragOrigin = null;
        dragEnd = null;
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        setNewName(newName.trim());
        props.onSaveClick(newName.trim());
    };

    return (
        <div
            className={`${styles.root} ${
                props.isFormClosing ? styles.closing : ""
            }`}
            onClick={backdropClick}
            onKeyUp={({ key }) => {
                if (key === "Escape") {
                    cancel();
                }
            }}
        >
            <div className="content">
                <form onSubmit={submit}>
                    <h1>Your name is....</h1>
                    <input
                        type="text"
                        onChange={e => setNewName(e.target.value)}
                        value={newName}
                    ></input>
                    <div className="buttons">
                        <input type="button" onClick={cancel} value="Cancel" />
                        <input type="submit" value="Save" />
                    </div>
                </form>
            </div>
        </div>
    );
};
export default UsernameInputForm;
