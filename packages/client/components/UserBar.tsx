/**
 * Top bar with user controls - login/logout, username, etc.
 * This is the presentation part of user login logic
 * @mixes ./withUserLoginControl
 */

import React from "react";

import styles from "./UserBar.module.css";
import { P } from "./withUserLoginControl";
import { useSetRecoilState } from "recoil";
import { bgIndexState } from "../state-defs";

export const UserBar: React.FC<P> = props => {
    const setBgIndex = useSetRecoilState(bgIndexState);

    const anonymous = (
        <button
            type="button"
            onClick={props.onLogin}
            className="btn btn-blue align-middle text-sm"
        >
            Login
        </button>
    );
    const user = (
        <div>
            <span
                data-__meta="icon-userprofile"
                className="align-middle"
                onClick={() => setBgIndex(ind => ind + 1)}
            >
                ?
            </span>
            <span className="font-mono text-2xl text-gray-700 leading-8 align-middle ml-3">
                {props.username}
            </span>

            <button
                type="button"
                onClick={props.onLogout}
                className="btn btn-blue align-middle ml-3 text-sm"
            >
                Logout
            </button>
        </div>
    );

    return (
        <div className={styles.userbar}>
            {/* "Ear" undershadow */}
            <div className="earshadow"></div>
            {/* "Ear" */}
            <div className="ear"></div>
            {/* Primary pane */}
            <div className="pane">{props.username ? user : anonymous}</div>
        </div>
    );
};

export default UserBar;
