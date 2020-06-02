/**
 * Higher-order component extracting user login / logout logic from
 * presentational side.
 */

import React from "react";
import { useRecoilState } from "recoil";

import { playerState } from "../state-defs";

export interface P {
    username?: string;
    onLogout: () => void;
    onLogin: () => void;
}

export const withUserLoginControl = (UserBar: React.FC<P>) => {
    const playerName = "TypicalUser";

    const [player, setPlayer] = useRecoilState(playerState);
    const [pid] = React.useState(String(Math.random()));

    return (
        <UserBar
            onLogin={() => {
                setPlayer({
                    id: pid,
                    name: playerName
                });
            }}
            onLogout={() => {
                setPlayer(null);
            }}
            username={player?.name}
        ></UserBar>
    );
};

export default withUserLoginControl;
