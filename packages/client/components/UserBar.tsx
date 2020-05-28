import React from "react";

import { Btn } from "./Btn";

interface P {
    username?: string;
    onLogout: () => void;
    onLogin: () => void;
}

export const UserBar: React.FC<P> = props => {
    const anonymous = (
        <Btn type="button" onClick={props.onLogin}>
            Login
        </Btn>
    );
    const user = (
        <>
            <span data-__meta="icon-userprofile" className="align-middle">
                ?
            </span>
            <span className="font-mono text-2xl text-gray-700 leading-8 align-middle ml-2">
                {props.username}
            </span>

            <Btn
                type="button"
                onClick={props.onLogout}
                className="align-middle ml-3 text-sm"
            >
                Logout
            </Btn>
        </>
    );

    return (
        <div
            className="h-16 py-3 px-3 bg-yellow-500 overflow-hidden"
            style={{ zIndex: 200 }}
        >
            {props.username ? user : anonymous}
        </div>
    );
};

export default UserBar;
