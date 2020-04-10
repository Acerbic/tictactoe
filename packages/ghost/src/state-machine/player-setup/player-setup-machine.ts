/**
 * Implementation of the player-setup machine. Processes player connection to the game,
 * pre-game choices.
 */

const debuglog = require("debug")("ttt:ghost:debug");
import { Machine, StateMachine, MachineConfig, MachineOptions } from "xstate";
import {
    PlayerSetupContext,
    PlayerSetupStateSchema,
    PlayerSetupEvent
} from "./player-setup-schema";

const player_setup_machine_config: MachineConfig<
    PlayerSetupContext,
    PlayerSetupStateSchema,
    PlayerSetupEvent
> = {
    initial: "wait4client",
    states: {
        wait4client: {
            on: {
                SOC_CONNECT: {
                    target: "wait4rolepick",
                    actions: ["add_player", "emit_choose_role"]
                }
            }
        },
        wait4rolepick: {
            on: {
                SOC_IWANNABETRACER: {
                    target: "rolerequested",
                    actions: "store_role_requested"
                }
            }
        },
        rolerequested: {
            after: {
                0: "end"
            }
        },
        end: {
            type: "final"
        }
    }
};

const player_setup_machine_options: Partial<MachineOptions<
    PlayerSetupContext,
    PlayerSetupEvent
>> = {
    actions: {
        add_player: (ctx, event: PlayerSetupEvent) => {
            if (event.type === "SOC_CONNECT") {
                const { player_id, submachine_id, socket } = event;
                ctx.parent_ctx.players.set(player_id, {
                    id: player_id,
                    socket,
                    role_request: "first", // default
                    submachine_id
                });

                ctx.parent_ctx[submachine_id] = player_id;
            }
        },
        emit_choose_role: (ctx, event: PlayerSetupEvent) => {
            if (event.type === "SOC_CONNECT") {
                const socket = ctx.parent_ctx.players.get(event.player_id)!
                    .socket;
                socket.emit("choose_role");
            }
        },
        store_role_requested: (ctx, event: PlayerSetupEvent) => {
            if (event.type === "SOC_IWANNABETRACER") {
                ctx.parent_ctx.players.get(event.player_id)!.role_request =
                    event.role;
            }
        }
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
export = function player_setup(): PlayerSetupMachine {
    return Machine(player_setup_machine_config, player_setup_machine_options);
};
