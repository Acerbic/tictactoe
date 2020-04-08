/**
 * Actions for game-room machine
 */

const errorlog = require("debug")("ttt:ghost:error");
const debuglog = require("debug")("ttt:ghost:debug");

import { send, SendExpr, ActionFunction } from "xstate";

import {
    GameRoomContext,
    GameRoomEvent,
    GameRoom_PlayerConnected,
    GameRoom_PlayerPickRole
} from "./game-room-schema";
import { PlayerId } from "../../connectors/gmaster_api";

import {
    PlayerSetup_SocConnect_Event,
    PlayerSetup_SocIwannabetracer_Event
} from "../player-setup/player-setup-schema";

// shortcut
type ActionF = ActionFunction<GameRoomContext, GameRoomEvent>;

const translate_setup_player_connect: SendExpr<
    GameRoomContext,
    GameRoom_PlayerConnected
> = (ctx, event): PlayerSetup_SocConnect_Event => event;

// NOTE: xstate a bit broken, only allows functional mapping in xstate.send()
// from an event type to itself
const translate_setup_player_pick: SendExpr<
    GameRoomContext,
    any /*GameRoom_PlayerPickRole*/
> = (
    ctx,
    { type, player_id, role }
): any /*PlayerSetup_SocIwannabetracer_Event*/ => ({
    type,
    player_id,
    role
});

/**
 * Transform/pass event to an invoked service
 * GameRoom_PlayerConnected -> PlayerSetup_SocConnect_Event
 */
export const pass_setup_player_connect = send(translate_setup_player_connect, {
    to: (_, event) => event.submachine_id
});

/**
 * Transform/pass event to an invoked service
 * GameRoom_PlayerPickRole -> PlayerSetup_SocIwannabetracer_Event
 */
export const pass_setup_player_pick = send(translate_setup_player_pick, {
    to: (_, event) => event.submachine_id
});

/**
 * Initialize "current_player" context property based on
 * player's requested roles
 */
export const set_current_player: ActionF = ctx => {
    const it = ctx.players.values();
    const p1 = it.next().value;
    const p2 = it.next().value;

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
    const socket = ctx.players.get(ctx.current_player!).socket;
    ctx.emits_sync.then(() => {
        socket.emit("your_turn");
    });
};

export const emit_opponent_moved: ActionF = ctx => {
    const it = ctx.players.values();
    const p1 = it.next().value;
    const p2 = it.next().value;

    const socket_waiting = ctx.current_player == p1.id ? p2.socket : p1.socket;
    const socket_moving = ctx.players.get(ctx.current_player!).socket;

    ctx.emits_sync = ctx.emits_sync.then(() =>
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
        winner = ctx[ctx.latest_game_state!.turn] || null;
    }

    ctx.emits_sync.then(() => {
        ctx.players.forEach(player_context =>
            player_context.socket.emit("gameover", { winner })
        );
    });
};

export const all_dropgame: ActionF = ctx => {
    ctx.gm_connect.post("DropGame", {}, ctx.game_id);
};
