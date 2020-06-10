import decode from "jwt-decode";
import { atom, selector } from "recoil";

import { PlayerAuthState, playerAuthState } from "./playerAuth";
import { JWTSession } from "@trulyacerbic/ttt-apis/ghost-api";
export type { PlayerAuthState };
export { playerAuthState };

export const playerIdState = selector<string | null>({
    key: "player-id",
    get: ({ get }) => {
        const player = get(playerAuthState);
        if (!player?.token) {
            return null;
        }
        try {
            const decoded = decode(player.token) as JWTSession;
            return decoded.playerId;
        } catch (e) {
            return null;
        }
    }
});

export const roleAssignedState = atom<"first" | "second" | null>({
    key: "player-role",
    default: null
});

export const opponentRoleAssignedState = selector<"first" | "second" | null>({
    key: "opponent-role",
    get: ({ get }) => (get(roleAssignedState) === "first" ? "second" : "first")
});

export const bgIndexState = atom<number>({
    key: "bg-index",
    default: 0
});
