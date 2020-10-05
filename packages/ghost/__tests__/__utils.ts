import { API } from "@trulyacerbic/ttt-apis/ghost-api";

/**
 * client socket narrowed to emit API messages
 */
export interface GhostInSocket
    extends Omit<SocketIOClient.Socket, "emit" | "on" | "once"> {
    emit<T extends keyof API["in"], P extends API["in"][T]>(
        e: T,
        ...data: P extends void ? [] : [P]
    ): GhostInSocket;

    once<T extends keyof API["out"], P extends API["out"][T]>(
        e: T,
        fn: (payload: P) => any
    ): GhostInSocket;

    on<T extends keyof API["out"], P extends API["out"][T]>(
        e: T,
        fn: (payload: P) => any
    ): GhostInSocket;
}

/**
 *  Listen to server events and return a promise that fulfils when specific
 *  message is send. Additionally, if `predicate` is provided, it must evaluate
 *  the payload of the message to true.
 */
export async function socListen<
    L extends keyof API["out"],
    P extends API["out"][L]
>(
    s: GhostInSocket,
    listenMsg: L,
    predicate?: (data: P) => boolean
): Promise<P> {
    return new Promise(resolve => {
        const onceHandler = (response: P) => {
            if (typeof predicate === "function") {
                if (predicate(response)) {
                    resolve(response);
                } else {
                    // repeat
                    s.once(listenMsg, onceHandler);
                }
            } else {
                resolve(response);
            }
        };

        s.once(listenMsg, onceHandler);
    });
}

export async function socListenAfter<
    L extends keyof API["out"],
    P extends API["out"][L]
>(
    after: Function,
    s: GhostInSocket,
    listenMsg: L,
    predicate?: (data: P) => boolean
): Promise<P> {
    const promise = socListen(s, listenMsg, predicate);
    after();
    return promise;
}
