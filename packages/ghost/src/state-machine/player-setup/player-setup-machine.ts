/**
 * Implementation of the player-setup machine. Processes player connection to the game,
 * pre-game choices.
 */

const debuglog = require("debug")("ttt:ghost:debug");
const actionlog = require("debug")("ttt:ghost:action");

import {
    Machine,
    StateMachine,
    MachineConfig,
    MachineOptions,
    assign,
    AssignAction,
    sendParent
} from "xstate";
import {
    PlayerSetupContext,
    PlayerSetupStateSchema,
    PlayerSetupEvent
} from "./player-setup-schema";
import { GameRoom_PlayerConnected } from "../game-room/game-room-schema";

const player_setup_machine_config: MachineConfig<
    PlayerSetupContext,
    PlayerSetupStateSchema,
    PlayerSetupEvent
> = {
    initial: "wait4rolepick",
    states: {
        wait4rolepick: {
            onEntry: "emit_choose_role",
            on: {
                SOC_IWANNABETRACER: {
                    target: "ready2play",
                    actions: "store_role_requested"
                },
                SOC_DISCONNECT: "aborted"
            }
        },
        ready2play: {
            type: "final",
            onEntry: "announce_player_ready"
        },
        aborted: {
            type: "final"
        }
    },
    context: {
        desired_role: "first"
    }
};

const player_setup_machine_options: Partial<MachineOptions<
    PlayerSetupContext,
    PlayerSetupEvent
>> = {
    actions: {
        emit_choose_role: ctx => {
            actionlog(ctx.player_id, "emit_choose_role");
            ctx.socket!.emit("choose_role");
        },

        store_role_requested: assign((ctx, event) => {
            actionlog(ctx.player_id, "store_role_requested");
            if (event.type === "SOC_IWANNABETRACER") {
                return { desired_role: event.role };
            } else {
                return {};
            }
        }),

        announce_player_ready: sendParent(
            ({ player_id, socket, desired_role }: PlayerSetupContext) => {
                actionlog(player_id, "announce_player_ready");
                return {
                    type: "PLAYER_READY",
                    player_id,
                    socket,
                    desired_role
                };
            }
        )
    }
};

type PlayerSetupMachine = StateMachine<
    PlayerSetupContext,
    PlayerSetupStateSchema,
    PlayerSetupEvent
>;

/**
 * Generate a machine for player setup
 */
export = function player_setup(
    initialCtx?: PlayerSetupContext
): PlayerSetupMachine {
    const m: PlayerSetupMachine = Machine(
        player_setup_machine_config,
        player_setup_machine_options
    );
    return initialCtx ? m.withContext(initialCtx) : m;
};
