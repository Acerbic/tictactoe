import React from "react";

interface P {
    playerId: string;
    setPlayerId: (n: string) => void;
    /**
     * False if connection is not yet established
     * (input field then is available)
     */
    connected: boolean;
    connectBtn: () => void;
    disconnectBtn: () => void;
}

export const ConnectGroup: React.FC<P> = props => {
    // const [username, changeUsername] = React.useState(props.playerId);
    return (
        <div>
            <div className="form-group">
                <label htmlFor="pid">Player ID</label>
                <input
                    className="form-control"
                    name="pid"
                    value={props.playerId}
                    disabled={props.connected || undefined}
                    onChange={e => props.setPlayerId(e.target.value)}
                />
            </div>
            {!props.connected ? (
                <button
                    id="btnConnect"
                    type="button"
                    className="btn btn-primary"
                    disabled={props.connected || props.playerId.length == 0}
                    onClick={() => props.connectBtn()}
                >
                    Connect
                </button>
            ) : (
                <button
                    type="button"
                    className="btn btn-danger"
                    onClick={props.disconnectBtn}
                >
                    Disconnect
                </button>
            )}
        </div>
    );
};
export default ConnectGroup;
