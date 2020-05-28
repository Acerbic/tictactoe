import { atom, selector, RecoilState } from "recoil";

type PlayerState = {
    name: string;
    id: string;
} | null;

export const playerState = atom<PlayerState>({
    key: "app-player",
    default: null
});

export const roleSelectedState = atom<"first" | "second" | null>({
    key: "player-role",
    default: null
});
