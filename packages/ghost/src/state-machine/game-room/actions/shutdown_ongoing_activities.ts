import { GameRoom_Shutdown } from "../game-room-schema";
import { actionlog, AF } from "./index";

/**
 * Room is terminating - clear all hanging promises, fetch calls, timeouts,
 * etc...
 */
export const shutdown_ongoing_activities: AF<GameRoom_Shutdown> = (ctx, e) => {
    actionlog("shutdown");
    ctx.players.forEach(pinfo => {
        pinfo.setup_actor.stop?.();
    });
};
