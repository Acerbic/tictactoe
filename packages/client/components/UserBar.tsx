/**
 * Top bar with user controls - username (edit), etc.
 * This is a purely presentation part of user login logic
 * @mixes ./withUserLoginControl
 */

import React from "react";

import styles from "./UserBar.module.css";
import { useSetRecoilState } from "recoil";
import { bgIndexState } from "../state-defs";

export interface P {
    playerName: string;
    onPlayerNameClick: () => void;
}

export const UserBar: React.FC<P> = props => {
    const setBgIndex = useSetRecoilState(bgIndexState);

    return (
        <div className={styles.userbar}>
            {/* "Ear" undershadow */}
            <div className="earshadow"></div>
            {/* "Ear" */}
            <div className="ear"></div>
            {/* Primary pane */}
            <div className="pane">
                <div>
                    {/* Username edit icon */}
                    <span
                        data-__meta="icon-userprofile"
                        className="align-middle"
                        onClick={() => setBgIndex(ind => ind + 1)}
                    >
                        ?
                    </span>
                    {/* Username (edit on click) */}
                    <span
                        className="username"
                        onClick={props.onPlayerNameClick}
                    >
                        {props.playerName}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default UserBar;
