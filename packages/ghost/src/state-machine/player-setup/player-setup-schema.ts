/**
 * Description of player-setup machine
 */

import { PlayerId } from "@trulyacerbic/ttt-apis/gmaster-api";
import {
    GameRoom_PlayerDisconnected,
    GameRoom_PlayerPickRole
} from "../game-room/game-room-schema";
import { Socket } from "socket.io";

export interface PlayerSetupStateSchema {
    states: {
        wait4rolepick: {};
        ready2play: {};
        aborted: {};
    };
}

// accept events forwarded from parent machine
export type PlayerSetupEvent =
    // socket.io Socket instance has circular references, which
    // prevents its serialization with JSON, so it can't be passed
    // to a child machine from parent via event
    Omit<GameRoom_PlayerDisconnected, "socket"> | GameRoom_PlayerPickRole;

export type PlayerSetupContext = {
    socket?: Socket;
    player_id?: PlayerId;
    desired_role: "first" | "second";
};
