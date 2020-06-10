import debug from "debug";

export const statelog = debug("ttt:ghost:xstate");
export const hostlog = debug("ttt:ghost:host");
export const errorlog = debug("ttt:ghost:error");
export const debuglog = debug("ttt:ghost:debug");

// usage:
// import  {statelog, hostlog, errorlog, debuglog} from "./utils"

import { Socket } from "socket.io";
import { API } from "@trulyacerbic/ttt-apis/ghost-api";

// server-side socket narrowed to emit API messages
export interface GhostOutSocket extends Omit<Socket, "once" | "on"> {
    emit<T extends keyof API["out"], P extends API["out"][T]>(
        e: T,
        ...data: P extends void ? [] : [P]
    ): boolean;

    once<T extends keyof API["in"], P extends API["in"][T]>(
        e: T,
        fn: (...a: P extends void ? [] : [P]) => any
    ): GhostOutSocket;

    on<T extends keyof API["in"], P extends API["in"][T]>(
        e: T,
        fn: (...data: P extends void ? [] : [P]) => any
    ): GhostOutSocket;
}
