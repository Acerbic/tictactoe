import { Machine, StateMachine, MachineConfig, MachineOptions} from 'xstate';
import {
    PlayerSetup_SocConnect_Event,
    PlayerSetup_SocIwannabetracer_Event,
    PlayerSetupContext,
    PlayerSetupStateSchema,
    PlayerSetupEvent} from './player-setup-schema';

const player_setup_machine_config : MachineConfig<
    PlayerSetupContext, PlayerSetupStateSchema, PlayerSetupEvent> = {

    initial: 'wait4client',
    states: {
        wait4client: {
            on: {
                SOC_CONNECT: {
                    target: 'wait4rolepick',
                    actions: ['add_player', 'emit_choose_role'],
                }
            }
        },
        wait4rolepick: {
            on: {
                SOC_IWANNABETRACER: {
                    target: 'rolerequested',
                    actions: 'store_role_requested',
                }
            }
        },
        rolerequested: {
            after: {
                0: 'end'
            }
        },
        end: {
            type: 'final'
        }
    }
};

const player_setup_machine_options : Partial<MachineOptions<
    PlayerSetupContext, PlayerSetupEvent>> = {

    actions: {
        add_player: (ctx, event : PlayerSetup_SocConnect_Event) => {
            const {player_id, submachine_id, socket} = event;
            ctx.parent_ctx.players.set(player_id, {
                id: player_id,
                socket,
                role_request: null,
                submachine_id
            });

            ctx.parent_ctx[submachine_id] = player_id;
        },
        emit_choose_role: (ctx, event : PlayerSetup_SocConnect_Event) => {
            const socket = ctx.parent_ctx.players.get(event.player_id).socket;
            socket.emit('choose_role');
        },
        store_role_requested: (ctx, event : PlayerSetup_SocIwannabetracer_Event) => {
            ctx.parent_ctx.players.get(event.player_id).role_request = event.role;
        }
    }
}


/**
 * Generate a machine for player setup
 */
export = function player_setup()
    : StateMachine<PlayerSetupContext, PlayerSetupStateSchema, PlayerSetupEvent> {
        
    return Machine(
        player_setup_machine_config, player_setup_machine_options
    );
}
