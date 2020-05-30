import React from "react";

import { Btn } from "./Btn";

import styles from "./UserBar.module.css";

interface P {
    username?: string;
    onLogout: () => void;
    onLogin: () => void;
}

export const UserBar: React.FC<P> = props => {
    const anonymous = (
        <Btn
            type="button"
            onClick={props.onLogin}
            className="align-middle text-sm"
        >
            Login
        </Btn>
    );
    const user = (
        <div>
            <span data-__meta="icon-userprofile" className="align-middle">
                ?
            </span>
            <span className="font-mono text-2xl text-gray-700 leading-8 align-middle ml-3">
                {props.username}
            </span>

            <Btn
                type="button"
                onClick={props.onLogout}
                className="align-middle ml-3 text-sm"
            >
                Logout
            </Btn>
        </div>
    );

    return (
        <div className={styles.userbar}>
            {/* "Ear" undershadow */}
            <div className={styles.earshadow}></div>
            {/* "Ear" */}
            <div className={styles.ear}></div>
            {/* Primary pane */}
            <div className={styles.pane}>
                {props.username ? user : anonymous}
            </div>
        </div>
    );
};

export default UserBar;
