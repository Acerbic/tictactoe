import { assign } from "xstate/lib/actions";

import { populate_update_meta } from "../../../utils";
import { actionlog } from "./index";
import {
    GameRoomContext,
    GameRoom_PlayerReconnected
} from "../game-room-schema";

export const top_reconnect = assign<
    GameRoomContext,
    GameRoom_PlayerReconnected
>((ctx, event) => {
    actionlog("top_reconnect");

    // reconnection during game in progress - update socket
    // Note: this is a bit cheesy to just plop assignment inside "assign"
    // already, but it is more concise than fiddling with Map
    ctx.players.get(event.player_id)!.socket = event.socket;

    if (ctx.game_state) {
        event.socket.emit("update", populate_update_meta(ctx, ctx.game_state));
    } else {
        event.socket.emit("server_error", {
            message: "Missing game state",
            abandonGame: true
        });
    }

    return {};
});
