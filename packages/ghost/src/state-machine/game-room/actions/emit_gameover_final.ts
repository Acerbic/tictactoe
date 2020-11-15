import { GameRoom_PlayerReconnected } from "../game-room-schema";
import { actionlog, AF } from "./index";

export const emit_gameover_final: AF<GameRoom_PlayerReconnected> = (ctx, e) => {
    actionlog("emit_gameover_final");

    e.socket.emit("gameover", { winner: ctx.game_winner });
};
