import { ErrorPlatformEvent } from "xstate";
import { AF, actionlog } from "./index";

export const ack_invalid_move: AF<ErrorPlatformEvent> = (ctx, e) => {
    actionlog("ack_invalid_move", e.type);

    e.data.srcEvent.ack?.(false);
};
