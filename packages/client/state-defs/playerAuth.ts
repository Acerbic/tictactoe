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
    // null value means the name was not set even to default "Anonymous"
    // when name is null, the user will be prompted with an input form
    name: string | null;
    // jwt
    token: string | null;
};

const [playerAuthState, playerAuthStateInitializer] = atomLocalStorage<
    PlayerAuthState
>({
    storageKey: "ttt-player",
    default: { name: null, token: null }
});

export const usePlayerAuthInitialize = () => {
    const setValue = useSetRecoilState(playerAuthState);
    useEffect(() => {
        playerAuthStateInitializer(setValue);
    }, []);
};

export { playerAuthState };
