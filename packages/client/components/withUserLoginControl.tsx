/**
 * Higher-order component extracting user login / logout logic from
 * presentational side. There's no particular reason for HOC pattern,
 * I just wanted to use it for something.
 */

import React from "react";
import { useRecoilState } from "recoil";

import { playerAuthState } from "../state-defs";

export interface UserLoginDetails {
    // TODO: ??? just JWTSession?
}

export interface P {
    loginDetails: UserLoginDetails | null;
    playerName: string;
    onPlayerNameChange: (v: string) => void;
    onLogout: () => void;
    onLogin: () => void;
}

/**
 * HOC function. Takes a component with properties defined above
 * to visually displace the user bar UI, while lifting up all of the
 * actual authentication logic from it.
 */
export const withUserLoginControl = (UserBar: React.FC<P>) => {
    const [player, setPlayer] = useRecoilState(playerAuthState);
    const [pid] = React.useState(String(Math.random()));

    const onLogin = () => {
        // TODO:
    };

    const onLogout = () => {
        // TODO:
    };

    const onPlayerNameChange = (name: string) => {
        // TODO: not allow empty names
        setPlayer(current =>
            current ? { ...current, name } : { token: null, name }
        );
    };

    return (
        <UserBar
            onLogin={onLogin}
            onLogout={onLogout}
            loginDetails={null}
            playerName={player?.name || "Anonymous"}
            onPlayerNameChange={onPlayerNameChange}
        ></UserBar>
    );
};

export default withUserLoginControl;
