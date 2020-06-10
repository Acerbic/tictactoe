/**
 * Top bar with user controls - login/logout, username, etc.
 * This is the presentation part of user login logic
 * @mixes ./withUserLoginControl
 */

// TODO: make playerName editable field (with local state proxy?)

import React from "react";

import styles from "./UserBar.module.css";
import { P } from "./withUserLoginControl";
import { useSetRecoilState } from "recoil";
import { bgIndexState } from "../state-defs";

export const UserBar: React.FC<P> = props => {
    const setBgIndex = useSetRecoilState(bgIndexState);

    const anonymous = (
        <div>
            {/* TODO: Login feature is currently in dev */}
            {/* <button
                type="button"
                onClick={props.onLogin}
                className="btn btn-blue align-middle text-sm"
            >
                Login
            </button> */}
        </div>
    );
    const user = (
        <div>
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
            <div className="pane">
                <div>
                    <span
                        data-__meta="icon-userprofile"
                        className="align-middle"
                        onClick={() => setBgIndex(ind => ind + 1)}
                    >
                        ?
                    </span>
                    <span className="font-mono text-2xl text-gray-700 leading-8 align-middle ml-3">
                        {props.playerName}
                    </span>

                    {props.loginDetails ? user : anonymous}
                </div>
            </div>
        </div>
    );
};

export default UserBar;
