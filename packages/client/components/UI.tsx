/**
 * UI overlay over game display.
 */

import React, { useRef } from "react";
import { useRecoilValue } from "recoil";

import { playerAuthState } from "../state-defs";
import { UserBar } from "./UserBar";
import { UsernameInputScreen } from "./UsernameInputScreen";

export const UI: React.FC = () => {
    const player = useRecoilValue(playerAuthState);

    const sendRef = useRef<any>(null);
    return (
        <>
            <UserBar
                onPlayerNameClick={() => sendRef.current?.("EDIT_NAME")}
                playerName={player?.name || "..."}
            ></UserBar>

            <UsernameInputScreen sendRef={sendRef} />
        </>
    );
};

export default UI;
