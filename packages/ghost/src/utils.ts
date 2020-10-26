import debug from "debug";

export const statelog = debug("ttt:ghost:xstate");
export const hostlog = debug("ttt:ghost:host");
export const errorlog = debug("ttt:ghost:error");
export const debuglog = debug("ttt:ghost:debug");

// usage:
// import  {statelog, hostlog, errorlog, debuglog} from "./utils"

import { Socket } from "socket.io";
import { API } from "@trulyacerbic/ttt-apis/ghost-api";
import {
    GameRoomContext,
    GameRoomEvent
} from "./state-machine/game-room/game-room-schema";
import { ActionObject, AnyEventObject } from "xstate";
import { PlayersPoolEvent } from "./state-machine/players-pool/players-pool-machine";
import { choose, pure, send } from "xstate/lib/actions";

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

type PromiseOnFulfill<T> = Promise<T>["then"] extends (
    onfulfilled: infer A
) => any
    ? A
    : never;
type PromiseOnReject<T> = Promise<T>["then"] extends (
    onfulfilled: any,
    onrejected: infer A
) => any
    ? A
    : never;

export function chain_promise<F = any, R = any>(
    ctx: GameRoomContext,
    onfulfilled: PromiseOnFulfill<F>,
    onrejected?: PromiseOnReject<R>
) {
    ctx.emits_sync = ctx.emits_sync.then(onfulfilled, onrejected);
}

/**
 * Game state as reported by gmaster is incomplete. This function appends
 * data that is needed by client but is only known by ghost.
 */
export function populate_update_meta(
    ctx: GameRoomContext,
    data: API["out"]["update"]
): API["out"]["update"] {
    const meta = Object.assign(data.meta || {}, {
        playerNames: {
            [data.player1]: ctx.players.get(data.player1)!.name,
            [data.player2]: ctx.players.get(data.player2)!.name
        }
    });
    return { ...data, meta };
}

export class UnexpectedEvent extends Error {
    constructor(event: AnyEventObject, more?: string) {
        super(
            `Unexpected event encountered: ${event.type}.` + more &&
                ` (${more})`
        );
    }
}

/**
 * Check state of player_pool machine and if its not not ended yet - send it an event
 */
export function send_to_ppool(
    eventOrEventBuilder:
        | PlayersPoolEvent
        | ((ctx: GameRoomContext, event: GameRoomEvent) => PlayersPoolEvent)
): ActionObject<GameRoomContext, GameRoomEvent> {
    if (typeof eventOrEventBuilder === "function") {
        return pure((ctx, event) =>
            choose<GameRoomContext, GameRoomEvent>([
                {
                    cond: (ctx, e, { state }) =>
                        !state.children.player_pool?.state?.done,
                    actions: send(eventOrEventBuilder(ctx, event), {
                        to: "player_pool"
                    })
                }
            ])
        );
    } else {
        return choose<GameRoomContext, GameRoomEvent>([
            {
                cond: (ctx, e, { state }) =>
                    !state.children.player_pool?.state?.done,
                actions: send(eventOrEventBuilder, { to: "player_pool" })
            }
        ]);
    }
}
