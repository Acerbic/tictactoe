/**
 * Actions for game-room machine
 */

import { statelog, hostlog, errorlog, debuglog } from "../../utils";
import debug from "debug";
const actionlog = debug("ttt:ghost:action");

import {
    ActionFunction,
    assign,
    spawn,
    Spawnable,
    AnyEventObject,
    DoneInvokeEvent,
    ErrorPlatformEvent
} from "xstate";

import {
    GameRoomContext,
    GameRoomEvent,
    GameRoom_PlayerDisconnected,
    GameRoom_PlayerReady,
    GameRoom_PlayerPickRole,
    PlayerInfo,
    GameRoom_PlayerQuit,
    isGREvent,
    GameRoom_PlayerJoinRoom,
    GameRoom_PlayerDisconnectTimeout,
    GameRoom_Shutdown
} from "./game-room-schema";
import { API } from "@trulyacerbic/ttt-apis/ghost-api";

import player_setup from "../player-setup/player-setup-machine";
import {
    MakeMoveResponse,
    CreateGameResponse
} from "@trulyacerbic/ttt-apis/gmaster-api";

import { chain_promise, populate_update_meta } from "../../utils";

import * as actors from "./actors";

// shortcut to ActionFunction signature
type AF<E extends AnyEventObject = GameRoomEvent> = ActionFunction<
    GameRoomContext,
    E
>;

export const ack_invalid_move: AF<ErrorPlatformEvent> = (ctx, e) => {
    actionlog("ack_invalid_move", e.type);

    e.data.srcEvent.ack?.(false);
};

export const emit_server_error_fatal: AF<ErrorPlatformEvent> = (ctx, e) => {
    actionlog("emit_server_error_fatal", e.type);

    ctx.players.forEach(player_context =>
        player_context.socket.emit("server_error", {
            message: "Server did an oopsy... try again a few minutes later",
            abandonGame: true
        })
    );
};

export const emit_game_started: AF<DoneInvokeEvent<CreateGameResponse>> = (
    ctx,
    e
) => {
    actionlog("emit_game_started");

    // e.type === "done.invoke.invoke_create_game"
    const players = Array.from(ctx.players.values());
    const [p1, p2] = players;

    debuglog(">> emitting game_started for ", p1.id);
    p1.socket.emit("game_started", {
        opponentName: p2.name,
        gameId: ctx.game_id!,
        role: ctx.player1 == p1.id ? "first" : "second"
    });

    debuglog(">> emitting game_started for ", p2.id);
    p2.socket.emit("game_started", {
        opponentName: p1.name,
        gameId: ctx.game_id!,
        role: ctx.player1 == p2.id ? "first" : "second"
    });

    // technically a duplicate code from `emit_update_both`, but it is easier
    // this way, and forces order of emits (actions order in machine
    // definition can't be relied upon)
    const data: API["out"]["update"] = populate_update_meta(
        ctx,
        e.data.newState
    );
    ctx.players.forEach(player_context => {
        debuglog(">> emitting update for ", player_context.id);
        player_context.socket.emit("update", data);
    });
};

export const finalize_setup: AF = ctx => {
    actionlog("finalize_setup");

    const [p1, p2] = ctx.players.values();

    // "player1" goes first
    ctx.player1 = p1.id;
    ctx.player2 = p2.id;

    if (p1.role_request === p2.role_request) {
        // role request conflict -> coin toss
        if (Math.random() > 0.5) {
            [ctx.player1, ctx.player2] = [p2.id, p1.id];
        }
    } else {
        if (p1.role_request == "second") {
            // different roles requested, but opposite to positions - swap
            // positions
            [ctx.player1, ctx.player2] = [p2.id, p1.id];
        }
    }
};

export const emit_gameover: AF<
    | GameRoom_PlayerDisconnectTimeout
    | GameRoom_PlayerQuit
    | DoneInvokeEvent<MakeMoveResponse>
> = (ctx, e) => {
    actionlog("emit_gameover");

    let winner: API["out"]["gameover"]["winner"] = null;

    if (isGREvent(e, "SOC_PLAYER_QUIT") || isGREvent(e, "DISCONNECT_TIMEOUT")) {
        // game ended with a rage quit
        if (ctx.player1 === e.player_id) {
            winner = ctx.player2!;
        } else if (ctx.player2 === e.player_id) {
            winner = ctx.player1!;
        } else {
            // this should not happen!
        }
    } else {
        // normal game finish
        if (e.data.newState.game == "over") {
            if (e.data.newState.turn === "player1") {
                winner = ctx.player2!;
            } else {
                winner = ctx.player1!;
            }
        }
    }

    chain_promise(ctx, () => {
        ctx.players.forEach(player_context =>
            player_context.socket.emit("gameover", { winner })
        );
    });
};

export const call_dropgame: AF = ctx => {
    actionlog("call_dropgame");

    ctx.gm_connect.post("DropGame", {}, ctx.game_id);
};

export const initiate_player_setup = assign<
    GameRoomContext,
    GameRoom_PlayerJoinRoom
>((ctx, { player_id, player_name, socket }) => {
    actionlog("initiate_player_setup");

    const pinfo: PlayerInfo = {
        id: player_id,
        name: player_name,
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
export const forward_soc_event: AF<GameRoom_PlayerPickRole> = (ctx, event) => {
    actionlog("forward_soc_event", event.player_id, event.type);

    const pinfo = ctx.players.get(event.player_id);
    if (pinfo?.setup_actor.state && !pinfo.setup_actor.state.done) {
        pinfo.setup_actor.send(event);
    }
};

export const add_ready_player: AF<GameRoom_PlayerReady> = (
    ctx,
    { player_id, desired_role }
) => {
    actionlog("add_ready_player");

    const pinfo: PlayerInfo = ctx.players.get(player_id)!;
    pinfo.role_request = desired_role;
};

/**
 * Delete from players list and free player-setup machine. The room is then
 * occupied by the remaining player or is empty in the waiting list.
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

export const top_disconnect = assign<
    GameRoomContext,
    GameRoom_PlayerDisconnected
>((ctx, { player_id }) => {
    // disconnect during game in progress - don't drop the game, await
    // reconnection instead
    actionlog("top-disconnect", player_id);

    //TODO: inform players of disconnect

    // start a reconnection timeout
    const cb_actor = actors.reconnect_timer(player_id);
    ctx.players.get(player_id)!.reconnect_actor = spawn(
        cb_actor,
        "reconnect_timer"
    );

    return {};
});

// we need to use `assign` to register the spawned actor with the system
export const emit_update_both = assign<GameRoomContext, GameRoomEvent>(ctx => {
    actionlog("emit_update_both");

    const thePromise = actors.emit_update_both(ctx);

    spawn(thePromise, "emit_update_both");

    // no actual assignment, the actor is free-floating
    return {};
});

export const top_reconnect = assign<GameRoomContext, GameRoomEvent>(
    (ctx, event) => {
        if (event.type !== "SOC_RECONNECT") {
            return {};
        }

        actionlog("top_reconnect");

        // reconnection during game in progress - update socket

        // Note: this is a bit cheesy to just plop assignment inside "assign"
        // already, but it is more concise than fiddling with Map
        ctx.players.get(event.player_id)!.socket = event.socket;

        // cancel reconnect timer
        ctx.players
            .get(event.player_id)
            ?.reconnect_actor?.send({ type: "ABORT_TIMER" });

        const thePromise = actors.top_reconnect(ctx, event);

        // FIXME: "top_reconnect" is not unique - both players can theoretically
        // reconnect at the same time
        spawn(thePromise, "top_reconnect");

        // no actual ref assignment, the actor is free-floating
        return {};
    }
);

/**
 * Room is terminating - clear all hanging promises, fetch calls, timeouts,
 * etc...
 */
export const shutdown_ongoing_activities: AF<GameRoom_Shutdown> = (ctx, e) => {
    actionlog("shutdown");
    ctx.players.forEach(pinfo => {
        pinfo.setup_actor.stop?.();
        pinfo.reconnect_actor?.stop?.();
    });
};
