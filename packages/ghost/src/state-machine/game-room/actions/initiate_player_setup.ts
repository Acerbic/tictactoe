import { Actor, spawn } from "xstate";
import { assign } from "xstate/lib/actions";

import {
    PlayerSetupContext,
    PlayerSetupEvent
} from "src/state-machine/player-setup/player-setup-schema";
import player_setup from "../../player-setup/player-setup-machine";
import {
    GameRoomContext,
    GameRoom_PlayerJoinRoom,
    PlayerInfo
} from "../game-room-schema";
import { actionlog } from "./index";

export const initiate_player_setup = assign<
    GameRoomContext,
    GameRoom_PlayerJoinRoom
>((ctx, { player_id, player_name, socket }) => {
    actionlog("initiate_player_setup");

    const pinfo: PlayerInfo = {
        id: player_id,
        name: player_name,
        socket,
        setup_actor: (spawn<PlayerSetupContext, PlayerSetupEvent>(
            player_setup({
                player_id,
                socket,
                desired_role: "first"
            }),
            player_id
        ) as unknown) as Actor<PlayerSetupContext, PlayerSetupEvent>
    };
    return {
        players: ctx.players.set(player_id, pinfo)
    };
});
