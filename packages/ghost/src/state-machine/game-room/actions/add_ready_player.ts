import { GameRoom_PlayerReady, PlayerInfo } from "../game-room-schema";
import { actionlog, AF } from "./index";

export const add_ready_player: AF<GameRoom_PlayerReady> = (
    ctx,
    { player_id, desired_role }
) => {
    actionlog("add_ready_player");

    const pinfo: PlayerInfo = ctx.players.get(player_id)!;
    pinfo.role_request = desired_role;
};
