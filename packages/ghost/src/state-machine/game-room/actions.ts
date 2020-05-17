/**
 * Actions for game-room machine
 */

import { statelog, hostlog, errorlog, debuglog } from "../../utils";
import debug from "debug";
const actionlog = debug("ttt:ghost:action");

import { ActionFunction, assign, spawn, Spawnable } from "xstate";

import {
    GameRoomContext,
    GameRoomEvent,
    GameRoom_PlayerConnected,
    GameRoom_PlayerDisconnected,
    GameRoom_PlayerReady,
    GameRoom_PlayerPickRole,
    PlayerInfo
} from "./game-room-schema";
import { API } from "@trulyacerbic/ttt-apis/ghost-api";
import { PlayerId } from "@trulyacerbic/ttt-apis/gmaster-api";

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

// shortcut to ActionFunction signature
type ActionF<E extends GameRoomEvent = GameRoomEvent> = ActionFunction<
    GameRoomContext,
    E
>;

/**
 * Send 'iamalreadytracer' to both clients
 */
export const emit_iamalreadytracer: ActionF = ctx => {
    actionlog("emit_iamalreadytracer");
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
    actionlog("emit_you_are_it");
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
 * Send 'your_turn' to a client
 */
export const emit_your_turn: ActionF = ctx => {
    actionlog("emit_your_turn");
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

export const finalize_setup: ActionF = ctx => {
    actionlog("finalize_setup");
    const [p1, p2] = ctx.players.values();
    ctx.player1 = p1.id;
    ctx.player2 = p2.id;

    if (p1.role_request === p2.role_request) {
        // role request conflict -> cointoss
        ctx.current_player = Math.random() > 0.5 ? p1.id : p2.id;
    } else {
        ctx.current_player = p1.role_request == "second" ? p2.id : p1.id;
    }
};

export const switch_player: ActionF = ctx => {
    actionlog("switch_player");
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

export const initiate_player_setup = assign<
    GameRoomContext,
    GameRoom_PlayerConnected
>((ctx, { player_id, socket }) => {
    const pinfo: PlayerInfo = {
        id: player_id,
        socket,
        setup_actor: spawn(
            player_setup({
                player_id,
                socket,
                desired_role: "first"
            }) as Spawnable,
            player_id
        )
    };
    return {
        players: ctx.players.set(player_id, pinfo)
    };
});

/**
 * Conditionally forwards event to a child actor
 * (actor must be not in final state)
 */
export const forward_soc_event: ActionF<GameRoom_PlayerPickRole> = (
    ctx,
    event
) => {
    actionlog("forward_soc_event", event.player_id, event.type);
    const pinfo = ctx.players.get(event.player_id);
    if (pinfo?.setup_actor.state && !pinfo.setup_actor.state.done) {
        pinfo.setup_actor.send(event);
    }
};

export const add_ready_player: ActionF<GameRoom_PlayerReady> = (
    ctx,
    { player_id, desired_role }
) => {
    actionlog("add_ready_player");
    const pinfo: PlayerInfo = ctx.players.get(player_id)!;
    pinfo.role_request = desired_role;
};

/**
 * Delete from players list and free player-setup machine
 */
export const clear_player_setup = assign<
    GameRoomContext,
    GameRoom_PlayerDisconnected
>((ctx, { player_id }) => {
    actionlog("clear_player_setup");
    const pinfo = ctx.players.get(player_id);
    if (pinfo?.setup_actor.state && !pinfo.setup_actor.state.done) {
        pinfo.setup_actor.send({ type: "SOC_DISCONNECT", player_id });
        pinfo.setup_actor.stop?.();
    }
    const players = new Map(ctx.players);
    players.delete(player_id);
    return {
        players
    };
});

export const top_disconnect: ActionF<GameRoom_PlayerDisconnected> = (
    ctx,
    event
) => {
    // disconnect during game in progress - don't drop the game,
    // await reconnection instead
    // TODO: inform players of disconnect
};

export const top_reconnect: ActionF<GameRoom_PlayerDisconnected> = (
    ctx,
    event
) => {
    // reconnection during game in progress - update socket
    ctx.players.get(event.player_id)!.socket = event.socket;

    ctx.getBoard(ctx.game_id!).then(board => {
        // update reconnected player's knowledge
        const data: API["out"]["reconnection"] = {
            gameId: ctx.game_id!,
            board,
            step:
                ctx.current_player === event.player_id
                    ? "my-turn"
                    : "opponents-turn"
        };
        event.socket.emit("reconnection", data);
    });
};
