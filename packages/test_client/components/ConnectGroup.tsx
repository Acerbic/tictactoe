import React from "react";

interface P {
    disabled: boolean;
    connectBtn: (id: string) => void;
}

export const ConnectGroup: React.FC<P> = props => (
    <div>
        <div className="form-group">
            <label htmlFor="pid">Player id</label>
            <input
                className="form-control"
                name="pid"
                disabled={props.disabled || null}
            ></input>
        </div>
        <button
            id="btnConnect"
            type="button"
            className="btn btn-primary"
            disabled={props.disabled || null}
            onClick={() => {
                // TODO: refactor into proper input field state???
                const playerId = (document.getElementsByName(
                    "pid"
                )[0] as HTMLInputElement).value;

                props.connectBtn(playerId);
            }}
        >
            Connect
        </button>
    </div>
);
export default ConnectGroup;
