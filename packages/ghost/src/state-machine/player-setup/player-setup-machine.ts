/**
 * Implementation of the player-setup machine. Processes player connection to the game,
 * pre-game choices.
 */

const debuglog = require("debug")("ttt:ghost:debug");
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
                    target: "ready2play",
                    actions: "store_role_requested"
                },
                SOC_DISCONNECT: {
                    target: "wait4client",
                    actions: assign<PlayerSetupContext, PlayerSetupEvent>({
                        player_id: undefined,
                        socket: undefined,
                        desired_role: "first"
                    })
                }
            }
        },
        ready2play: {
            type: "final",
            onEntry: "announce_player_ready"
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
        add_player: assign<PlayerSetupContext, GameRoom_PlayerConnected>(
            (_, { player_id, socket }) => ({
                player_id,
                socket,
                desired_role: "first"
            })
        ) as AssignAction<PlayerSetupContext, PlayerSetupEvent>,

        emit_choose_role: (ctx, event) => {
            if (event.type === "SOC_CONNECT") {
                event.socket.emit("choose_role");
            }
        },

        store_role_requested: assign((ctx, event) => {
            if (event.type === "SOC_IWANNABETRACER") {
                return { desired_role: event.role };
            } else {
                return {};
            }
        }),

        announce_player_ready: sendParent(
            ({ player_id, socket, desired_role }: PlayerSetupContext) => ({
                type: "PLAYER_READY",
                player_id,
                socket,
                desired_role
            })
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
export = function player_setup(): PlayerSetupMachine {
    debuglog("player_setup() called!");
    return Machine(player_setup_machine_config, player_setup_machine_options);
};
