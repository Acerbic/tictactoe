/**
 * Recoil state to encapsulate current user authentication session
 *
 * When PlayerAuthState.token === null, user is considered anonymous and name is
 * a (decorative) pseudonym. When token is not null, it is a JWT signed by the
 * game server and it is required for an active match to proceed.
 */

import { useEffect } from "react";
import { useSetRecoilState } from "recoil";
import { atomLocalStorage } from "./atomLocalStorage";

export type PlayerAuthState = {
    // player's displayed name
    name: string;

    // if player did not have a chance to enter his name yet (default name
    // "Anonymous" is assigned), this flag is set.
    nameAccepted: boolean;

    // jwt
    token: string | null;
};

const [playerAuthState, playerAuthStateInitializer] = atomLocalStorage<
    PlayerAuthState
>({
    storageKey: "ttt-player",
    default: { name: "Anonymous", nameAccepted: false, token: null }
});

export const usePlayerAuthInitialize = () => {
    const setValue = useSetRecoilState(playerAuthState);
    useEffect(() => {
        playerAuthStateInitializer(setValue);
    }, []);
};

export { playerAuthState };
