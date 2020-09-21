/**
 * Recoil state to encapsulate current user authentication session
 *
 * When PlayerAuthState.token === null, user is considered anonymous and name is
 * a (decorative) pseudonym. When token is not null, it is a JWT signed by the
 * game server and it is required for an active match to proceed.
 */

import { atomLocalStorage } from "./useLSRecoilState";

export type PlayerAuthState = {
    name: string;
    // jwt
    token: string | null;
};

const [playerAuthState, playerAuthStateInitializer] = atomLocalStorage<
    PlayerAuthState
>({
    storageKey: "ttt-player",
    default: { name: "Anonymous", token: null }
});

export { playerAuthState, playerAuthStateInitializer };
