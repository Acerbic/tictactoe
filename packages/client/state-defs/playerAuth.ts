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

const [
    playerAuthState,
    playerAuthStateInitializer
] = atomLocalStorage<PlayerAuthState | null>({
    storageKey: "ttt-player",
    // FIXME: see if recoil > 0.0.8 can use object defaults without throwing an
    // error "window is not defined"
    //default: { name: "Anonymous", token: null }
    default: null
});

export { playerAuthState, playerAuthStateInitializer };
