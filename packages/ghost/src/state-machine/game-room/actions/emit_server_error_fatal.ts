import { ErrorPlatformEvent } from "xstate";
import { AF, actionlog } from "./index";

export const emit_server_error_fatal: AF<ErrorPlatformEvent> = (ctx, e) => {
    actionlog("emit_server_error_fatal", e.type);

    ctx.players.forEach(player_context =>
        player_context.socket.emit("server_error", {
            message: "Server did an oopsy... try again a few minutes later",
            abandonGame: true
        })
    );
};
