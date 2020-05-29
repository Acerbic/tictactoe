import React from "react";

import { Btn } from "./Btn";

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
        <div className="h-16 border-yellow-500 flex" style={{ zIndex: 200 }}>
            <div
                className="border-yellow-900 "
                style={{
                    borderLeftColor: "transparent",
                    borderBottomColor: "transparent",
                    borderTopWidth: "2.25rem",
                    borderLeftWidth: "1.75rem",
                    marginRight: "-1.5rem"
                }}
            ></div>
            <div
                className="border-yellow-500 "
                style={{
                    borderLeftColor: "transparent",
                    borderBottomColor: "transparent",
                    borderTopWidth: "1.5rem",
                    borderLeftWidth: "1.5rem",
                    marginRight: "-0.05rem",
                    zIndex: 201
                }}
            ></div>
            {/* <div
                className="border-yellow-900"
                style={{
                    borderWidth: "1rem",
                    borderBottomLeftRadius: "1rem",
                    marginRight: "-1.95rem",
                    zIndex: 200
                }}
            ></div> */}
            <div
                className="py-3 px-3 bg-yellow-500 border-yellow-900"
                style={{
                    borderBottomWidth: "0.25rem",
                    borderLeftWidth: "0.05rem",
                    borderBottomLeftRadius: "1rem"
                }}
            >
                {props.username ? user : anonymous}
            </div>
        </div>
    );
};

export default UserBar;
