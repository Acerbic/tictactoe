import { assign } from "xstate/lib/actions";

import {
    GameRoomContext,
    GameRoom_PlayerDisconnected
} from "../game-room-schema";
import { actionlog } from "./index";

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
