/**
 * Description of player-setup machine
 */

import { PlayerId } from "../../connectors/gmaster_api";
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
    | GameRoom_PlayerDisconnected
    | GameRoom_PlayerPickRole;

export type PlayerSetupContext = {
    socket?: Socket;
    player_id?: PlayerId;
    desired_role: "first" | "second";
};
