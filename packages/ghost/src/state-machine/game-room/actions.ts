/**
 * Actions for game-room machine
 */

const errorlog = require("debug")("ttt:ghost:error");
const debuglog = require("debug")("ttt:ghost:debug");

import {
    ActionFunction,
    assign,
    AnyEventObject,
    spawn,
    forwardTo,
    Spawnable,
    Actor,
    AssignAction
} from "xstate";
import { Socket } from "socket.io";

import {
    GameRoomContext,
    GameRoomEvent,
    PlayerInfo,
    PlayerSetupMachineInfo,
    GameRoom_PlayerDropped,
    GameRoom_Start
} from "./game-room-schema";
import { PlayerId } from "../../connectors/gmaster_api";

import player_setup from "../player-setup/player-setup-machine";

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

function chain_promise<F = any, R = any>(
    ctx: GameRoomContext,
    onfulfilled: PromiseOnFulfill<F>,
    onrejected?: PromiseOnReject<R>
) {
    ctx.emits_sync = ctx.emits_sync.then(onfulfilled, onrejected);
}

// shortcut
type ActionF = ActionFunction<GameRoomContext, GameRoomEvent>;

/**
 * Initialize "current_player" context property based on
 * player's requested roles
 */
export const set_current_player: ActionF = ctx => {
    const [p1, p2] = ctx.players.values();

    ctx.current_player = p1.role_request == "second" ? p2.id : p1.id;
};

/**
 * Send 'iamalreadytracer' to both clients
 */
export const emit_iamalreadytracer: ActionF = ctx => {
    ctx.emits_sync.then(() => {
        ctx.players.forEach(player_context =>
            player_context.socket.emit("iamalreadytracer")
        );
    });
};

/**
 * Send 'you_are_it' to both clients
 */
export const emit_you_are_it: ActionF = ctx => {
    ctx.emits_sync.then(() => {
        ctx.players.forEach(player_context =>
            player_context.socket.emit(
                "you_are_it",
                ctx.current_player == player_context.id ? "first" : "second"
            )
        );
    });
};

/**
 * Toss a coin and decide who has the first turn
 */
export const cointoss_roles: ActionF = ctx => {
    ctx.current_player = Math.random() > 0.5 ? ctx.player1 : ctx.player2;
};

/**
 * Send 'your_turn' to a client
 */
export const emit_your_turn: ActionF = ctx => {
    const socket = ctx.players.get(ctx.current_player!)!.socket;
    ctx.emits_sync.then(() => {
        socket.emit("your_turn");
    });
};

export const emit_opponent_moved: ActionF = ctx => {
    const [p1, p2] = ctx.players.values();

    const socket_waiting = ctx.current_player == p1.id ? p2.socket : p1.socket;
    const socket_moving = ctx.players.get(ctx.current_player!)!.socket;

    chain_promise(ctx, () =>
        ctx
            .getBoard(ctx.game_id!)
            .then(board => {
                const turn = ctx[ctx.latest_game_state!.turn];
                return new Promise((resolve, reject) => {
                    socket_waiting.emit("opponent_moved", {
                        game_state: Object.assign({}, ctx.latest_game_state, {
                            turn
                        }),
                        board
                    });
                    socket_moving.emit("meme_accepted", {
                        game_state: Object.assign({}, ctx.latest_game_state, {
                            turn
                        }),
                        board
                    });
                    resolve();
                });
            })
            .catch(rejection => {
                errorlog("GetGameBoard rejection: " + rejection);
                // TODO: handle exception
            })
    );
};

export const switch_player: ActionF = ctx => {
    ctx.current_player =
        ctx.current_player == ctx.player1 ? ctx.player2 : ctx.player1;
};

export const emit_gameover: ActionF = ctx => {
    let winner: PlayerId | null = null;
    if (ctx.latest_game_state!.game == "over") {
        if (ctx.latest_game_state!.turn === "player1") {
            winner = ctx.player2!;
        } else {
            winner = ctx.player1!;
        }
    }

    ctx.emits_sync.then(() => {
        ctx.players.forEach(player_context =>
            player_context.socket.emit("gameover", { winner })
        );
    });
};

export const call_dropgame: ActionF = ctx => {
    ctx.gm_connect.post("DropGame", {}, ctx.game_id);
};

export const spawn_player_setup_machines = assign<GameRoomContext>(() => {
    debuglog("action: spawn_player_setup_machines");
    return {
        player_setup_machines: new Set<PlayerSetupMachineInfo>()
            .add({
                id: "player1setup",
                occupiedBy: null,
                ref: spawn(player_setup() as Spawnable, "player1setup")
            })
            .add({
                id: "player2setup",
                occupiedBy: null,
                ref: spawn(player_setup() as Spawnable, "player2setup")
            })
    };
});

function findSetupMachine(
    ctx: GameRoomContext,
    id: Socket["id"] | null
): PlayerSetupMachineInfo | null {
    for (let psm of ctx.player_setup_machines) {
        if (psm.occupiedBy === id) {
            return psm;
        }
    }
    return null;
}

/**
 * If this returns "" - it means something went wrong
 */
export const forward_soc_event = forwardTo<GameRoomContext, GameRoomEvent>(
    (ctx, event) => {
        if (event.type === "SOC_CONNECT") {
            let free = findSetupMachine(ctx, null);
            if (free) {
                free.occupiedBy = event.socket.id;
                return free.ref as Actor<any, AnyEventObject>;
            }
        }
        if (event.type === "SOC_DISCONNECT") {
            let existing = findSetupMachine(ctx, event.socket.id);
            return (existing?.ref as Actor<any, AnyEventObject>) || "";
        }
        if (event.type === "SOC_IWANNABETRACER") {
            let existing = findSetupMachine(ctx, event.socket.id);
            return (existing?.ref as Actor<any, AnyEventObject>) || "";
        }
        return "";
    }
);

export const store_player_info: ActionF = (ctx, event) => {
    if (event.type == "PLAYER_READY") {
        const { player_id, socket, desired_role } = event;
        ctx.players.set(player_id, {
            id: player_id,
            socket,
            role_request: desired_role
        });
    }
};

/**
 * Delete from players list and free player-setup machine
 */
export const remove_player_info = <ActionF>((
    ctx,
    event: GameRoom_PlayerDropped
) => {
    let pl_info = ctx.players.get(event.player_id);
    if (pl_info) {
        let machine_info = findSetupMachine(ctx, pl_info.socket.id);
        if (machine_info) {
            machine_info.occupiedBy = null;
        }
        ctx.players.delete(event.player_id);
    }
});

export const __assign_ctx_players = assign<GameRoomContext, GameRoom_Start>(
    ctx => {
        let [p1, p2] = ctx.players.values();

        return {
            player1: p1.id,
            player2: p2.id,
            current_player: p1.id
        };
    }
) as AssignAction<GameRoomContext, GameRoomEvent>;
