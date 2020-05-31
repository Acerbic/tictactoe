import { atom, selector, RecoilState } from "recoil";

type PlayerState = {
    name: string;
    id: string;
} | null;

export const playerState = atom<PlayerState>({
    key: "app-player",
    default: null
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
