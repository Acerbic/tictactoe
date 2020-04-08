/**
 * Description of player-setup machine
 */

import { PlayerId } from "../../connectors/gmaster_api";

export interface PlayerSetupStateSchema {
    states: {
        wait4client: {};
        wait4rolepick: {};
        rolerequested: {};
        end: {};
    };
}

export type PlayerSetup_SocConnect_Event = {
    type: "SOC_CONNECT";
    player_id: PlayerId;
    submachine_id: "player1" | "player2";
    socket: any;
};
export type PlayerSetup_SocIwannabetracer_Event = {
    type: "SOC_IWANNABETRACER";
    player_id: PlayerId;
    role: "first" | "second";
};

export type PlayerSetupEvent =
    | PlayerSetup_SocConnect_Event
    | PlayerSetup_SocIwannabetracer_Event;

export type PlayerSetupContext = {
    parent_ctx: any;
};
