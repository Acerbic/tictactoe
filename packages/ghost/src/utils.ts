import debug from "debug";

export const statelog = debug("ttt:ghost:xstate");
export const hostlog = debug("ttt:ghost:host");
export const errorlog = debug("ttt:ghost:error");
export const debuglog = debug("ttt:ghost:debug");

// usage:
// import  {statelog, hostlog, errorlog, debuglog} from "./utils"

import { Socket } from "socket.io";
import { API } from "@trulyacerbic/ttt-apis/ghost-api";

/**
 * Overloading methods to restrict emits to API definitions
 */
interface GhostInSocketEmitter extends SocketIOClient.Emitter {
    // NOTE: had to duplicate definiton somewhat to achieve both
    //  editor suggestion on known declared API events and
    //  ability to emit non-API events without limitation
    emit<
        T extends string,
        P extends T extends keyof API["in"] ? [API["in"][T]] : any[]
    >(
        e: T,
        ...data: P
    ): GhostInSocketEmitter;
    emit<T extends keyof API["in"], P extends API["in"][T]>(
        e: T,
        data: P
    ): GhostInSocketEmitter;

    once<
        T extends string,
        P extends T extends keyof API["out"] ? [API["out"][T]] : any[]
    >(
        e: T,
        fn: (...data: P) => any
    ): GhostInSocketEmitter;
    once<T extends keyof API["out"], P extends API["out"][T]>(
        e: T,
        fn: (a: P) => any
    ): GhostInSocketEmitter;

    on<
        T extends string,
        P extends T extends keyof API["out"] ? [API["out"][T]] : any[]
    >(
        e: T,
        fn: (...data: P) => any
    ): GhostInSocketEmitter;
    on<T extends keyof API["out"], P extends API["out"][T]>(
        e: T,
        fn: (data: P) => any
    ): GhostInSocketEmitter;
}

// client socket
export interface GhostInSocket
    extends Omit<SocketIOClient.Socket, "emit" | "on" | "once">,
        Omit<GhostInSocketEmitter, "emit"> {
    // NOTE: had to duplicate definiton somewhat to achieve both
    //  editor suggestion on known declared API events and
    //  ability to emit non-API events without limitation
    emit<
        T extends string,
        P extends T extends keyof API["in"] ? [API["in"][T]] : any[]
    >(
        e: T,
        ...data: P
    ): GhostInSocket;
    emit<T extends keyof API["in"], P extends API["in"][T]>(
        e: T,
        data: P
    ): GhostInSocket;
}

// server socket
export interface GhostOutSocket extends Socket {
    // NOTE: had to duplicate definiton somewhat to achieve both
    //  editor suggestion on known declared API events and
    //  ability to emit non-API events without limitation
    emit<
        T extends string | symbol,
        P extends T extends keyof API["out"] ? [API["out"][T]] : any[]
    >(
        e: T,
        ...data: P
    ): boolean;
    emit<T extends keyof API["out"], P extends API["out"][T]>(
        e: T,
        data: P
    ): boolean;
}
