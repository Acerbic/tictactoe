import { AF, actionlog } from "./index";

import { PlayerDisconnectTimeout } from "../../players-pool/players-pool-machine";

export const emit_gameover_timeout: AF<PlayerDisconnectTimeout> = (ctx, e) => {
    actionlog("emit_gameover_timeout");
    const winner = e.player_id === ctx.player1 ? ctx.player2! : ctx.player1!;

    for (const pinfo of ctx.players.values()) {
        pinfo.socket.connected && pinfo.socket.emit("gameover", { winner });
    }
};
