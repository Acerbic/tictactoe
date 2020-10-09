import { API } from "@trulyacerbic/ttt-apis/ghost-api";

type SocketEvents = "connect" | "disconnect";
// | "ping"
// | "pong"
// | "connect_error"
// | "connect_timeout"
// | "connecting"
// | "error"
// | "reconnect"
// | "reconnect_attempt"
// | "reconnect_failed"
// | "reconnect_error"
// | "reconnecting"

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
        e: T | SocketEvents,
        fn: (payload: P) => any
    ): GhostInSocket;

    on<T extends keyof API["out"], P extends API["out"][T]>(
        e: T | SocketEvents,
        fn: (payload: P) => any
    ): GhostInSocket;

    listen: <L extends keyof API["out"], P extends API["out"][L]>(
        listenMsg: L | SocketEvents,
        predicate?: (data: P) => boolean
    ) => Promise<P>;

    listenAfter: <L extends keyof API["out"], P extends API["out"][L]>(
        after: Function,
        listenMsg: L | SocketEvents,
        predicate?: (data: P) => boolean
    ) => Promise<P>;
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
    listenMsg: L | SocketEvents,
    predicate?: (data: P) => boolean
): Promise<P> {
    return new Promise(resolve => {
        if (typeof predicate === "function") {
            const handler = (payload: P) => {
                if (predicate(payload)) {
                    s.off(listenMsg, handler);
                    resolve(payload);
                }
            };

            s.on(listenMsg, handler);
        } else {
            s.once(listenMsg, (payload: P) => resolve(payload));
        }
    });
}

export async function socListenAfter<
    L extends keyof API["out"],
    P extends API["out"][L]
>(
    after: Function,
    s: GhostInSocket,
    listenMsg: L | SocketEvents,
    predicate?: (data: P) => boolean
): Promise<P> {
    const promise = socListen(s, listenMsg, predicate);
    after();
    return promise;
}
