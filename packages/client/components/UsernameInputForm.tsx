/**
 * A screen for player to input their name
 */

import React, { useEffect, useRef, useState } from "react";

import { playerAuthState } from "../state-defs/playerAuth";
import { useRecoilValue } from "recoil";

import styles from "./UsernameInputForm.module.css";

interface P {
    onSaveClick: (newName: string) => void;
    onCancelClick: () => void;
    isOpen: boolean;
}

// This structure tracks accidental mouse drag motion (for example, when
// mouse-selecting input field's contents) and is used to determine it the user
// actually indented to click the backdrop or not.
interface Drag {
    origin: EventTarget | null;
    end: EventTarget | null;
}

export const UsernameInputForm: React.FC<P> = props => {
    const player = useRecoilValue(playerAuthState);

    // the form will be rendered while player===undefined, but will not be
    // opened or shown, thus we need to stub player name with ""
    const [newName, setNewName] = useState<string>(player?.name || "");
    useEffect(() => {
        if (props.isOpen) {
            // resetting local name to global name when "isOpen" changed to true
            setNewName(player!.name);
        }
    }, [props.isOpen]);

    const drag = useRef<Drag>({ origin: null, end: null });

    const cancel = () => {
        props.onCancelClick();
    };

    const backdropClick = (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
        if (
            e.target === e.currentTarget &&
            drag.current.end === drag.current.origin
        ) {
            e.stopPropagation();
            e.preventDefault();
            cancel();
        }
        drag.current.origin = null;
        drag.current.end = null;
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        setNewName(newName.trim());
        props.onSaveClick(newName.trim());
    };

    return (
        <div
            className={`${styles.root} ${props.isOpen ? "" : styles.closing}`}
            onMouseDown={e => (drag.current.origin = e.target)}
            onMouseUp={e => (drag.current.end = e.target)}
            onClick={backdropClick}
        >
            <div className="content">
                <form onSubmit={submit}>
                    <h1>Your name is....</h1>
                    <input
                        type="text"
                        onChange={e => setNewName(e.target.value)}
                        value={newName}
                        disabled={!props.isOpen}
                    ></input>
                    <div className="buttons">
                        <input
                            type="button"
                            onClick={cancel}
                            value="Cancel"
                            disabled={!props.isOpen}
                        />
                        <input
                            type="submit"
                            value="Save"
                            disabled={!props.isOpen}
                        />
                    </div>
                </form>
            </div>
        </div>
    );
};
export default UsernameInputForm;
