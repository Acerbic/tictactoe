/**
 * Xstate machine actions.
 *
 * This file composes all the actions defined in the rest of the files in this
 * directory.
 */

import { ActionFunction, AnyEventObject, ActionObject } from "xstate";
import debug from "debug";
export const actionlog = debug("ttt:ghost:action");

import { GameRoomContext, GameRoomEvent } from "../game-room-schema";

// shortcut to ActionFunction signature
export type AF<E extends AnyEventObject = GameRoomEvent> = ActionFunction<
    GameRoomContext,
    E
>;

import { ack_invalid_move } from "./ack_invalid_move";
import { add_ready_player } from "./add_ready_player";
import { call_dropgame } from "./call_dropgame";
import { clear_player_setup } from "./clear_player_setup";
import { emit_gameover_final } from "./emit_gameover_final";
import { emit_gameover_timeout } from "./emit_gameover_timeout";
import { emit_gameover } from "./emit_gameover";
import { emit_game_started } from "./emit_game_started";
import { emit_server_error_fatal } from "./emit_server_error_fatal";
import { emit_update_and_gameover } from "./emit_update_and_gameover";
import { emit_update_both } from "./emit_update_both";
import { finalize_setup } from "./finalize_setup";
import { forward_soc_event } from "./forward_soc_event";
import { initiate_player_setup } from "./initiate_player_setup";
import { remove_done_players } from "./remove_done_players";
import { shutdown_ongoing_activities } from "./shutdown_ongoing_activities";
import { store_game_state } from "./store_game_state";
import { store_winner_forfeit } from "./store_winner_forfeit";
import { top_reconnect } from "./top_reconnect";

// recasting a collection of action with individual narrow event parameters to a
// collection of actions responding to a "group" event, as per XState
// requirement
export default ({
    ack_invalid_move,
    add_ready_player,
    call_dropgame,
    clear_player_setup,
    emit_gameover_final,
    emit_gameover_timeout,
    emit_gameover,
    emit_game_started,
    emit_server_error_fatal,
    emit_update_and_gameover,
    emit_update_both,
    finalize_setup,
    forward_soc_event,
    initiate_player_setup,
    remove_done_players,
    shutdown_ongoing_activities,
    store_game_state,
    store_winner_forfeit,
    top_reconnect
} as any) as Record<
    string,
    | ActionObject<GameRoomContext, GameRoomEvent>
    | ActionFunction<GameRoomContext, GameRoomEvent>
>;
