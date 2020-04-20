import React from "react";

import styles from "./RoleBtns.module.css";

interface P {
    disabled: boolean;
    btnClick: (role: string) => void;
}

export const RoleBtns: React.FC<P> = props => (
    <div className={styles["step-role"]}>
        <button
            id="btnFirst"
            type="button"
            className="btn btn-primary"
            disabled={props.disabled || null}
            onClick={() => props.btnClick("first")}
        >
            First
        </button>
        <button
            id="btnSecond"
            type="button"
            className="btn btn-primary"
            disabled={props.disabled || null}
            onClick={() => props.btnClick("second")}
        >
            Second
        </button>
    </div>
);

export default RoleBtns;
