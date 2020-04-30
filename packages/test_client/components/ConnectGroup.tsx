import React from "react";

interface P {
    disabled: boolean;
    connectBtn: (id: string) => void;
}

export const ConnectGroup: React.FC<P> = props => {
    const [username, changeUsername] = React.useState("");
    return (
        <div>
            <div className="form-group">
                <label htmlFor="pid">Player id</label>
                <input
                    className="form-control"
                    name="pid"
                    value={username}
                    disabled={props.disabled || null}
                    onChange={e => changeUsername(e.target.value)}
                />
            </div>
            <button
                id="btnConnect"
                type="button"
                className="btn btn-primary"
                disabled={props.disabled || username.length == 0}
                onClick={() => props.connectBtn(username)}
            >
                Connect
            </button>
        </div>
    );
};
export default ConnectGroup;
