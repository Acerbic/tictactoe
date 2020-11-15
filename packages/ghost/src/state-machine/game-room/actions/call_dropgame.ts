import { actionlog, AF } from "./index";

export const call_dropgame: AF = ctx => {
    actionlog("call_dropgame");

    ctx.gm_connect.post("DropGame", {}, ctx.game_id);
};
