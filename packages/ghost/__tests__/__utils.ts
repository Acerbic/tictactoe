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

export async function emitListen<
    E extends keyof API["in"],
    L extends keyof API["out"]
>(
    s: GhostInSocket,
    emitType: E,
    data: E extends keyof API["in"] ? API["in"][E] : never,
    listenType: L | number
): Promise<API["out"][L]> {
    return new Promise(resolve => {
        if (typeof listenType === "number") {
            s.emit(emitType, data);
            setTimeout(resolve, listenType);
        } else {
            s.once(listenType, response => resolve(response)).emit(
                emitType,
                data
            );
        }
    });
}
