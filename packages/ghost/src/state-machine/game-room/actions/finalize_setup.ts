import { actionlog, AF } from "./index";

export const finalize_setup: AF = ctx => {
    actionlog("finalize_setup");

    const [p1, p2] = ctx.players.values();

    // "player1" goes first
    ctx.player1 = p1.id;
    ctx.player2 = p2.id;

    if (p1.role_request === p2.role_request) {
        // role request conflict -> coin toss
        if (Math.random() > 0.5) {
            [ctx.player1, ctx.player2] = [p2.id, p1.id];
        }
    } else {
        if (p1.role_request == "second") {
            // different roles requested, but opposite to positions - swap
            // positions
            [ctx.player1, ctx.player2] = [p2.id, p1.id];
        }
    }
};
