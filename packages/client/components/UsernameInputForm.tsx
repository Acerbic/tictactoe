/**
 * A screen for player to input the name
 */

import React, { useEffect, useState } from "react";
import { useRecoilValue } from "recoil";

import { playerAuthState } from "../state-defs/playerAuth";

interface P {
    onSaveClick: (newName: string) => void;
    onCancelClick: () => void;
}

export const UsernameInputForm: React.FC<P> = props => {
    const { name } = useRecoilValue(playerAuthState);
    // because name is only being read on state initialization, there's no
    // reactive dependency i.e. even if during form operation underlying
    // playerAuthState.name changes, the form will not lose its input field
    // value
    const [newName, setNewName] = useState<string>(name || "Anonymous");

    return (
        <div>
            <input
                type="text"
                onChange={e => setNewName(e.target.value)}
                value={newName}
            ></input>
            <input type="button" onClick={props.onCancelClick} value="Cancel" />
            <input
                type="submit"
                onClick={() => props.onSaveClick(newName)}
                value="Save"
            />
        </div>
    );
};
export default UsernameInputForm;
