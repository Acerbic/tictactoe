const xstate = require('xstate');

const player_setup = {
    initial: 'wait4client',
    states: {
        wait4client: {
            on: {
                SOC_CONNECT: {
                    target: 'wait4rolepick',
                    actions: 'emit_choose_role',
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
            type: 'final'
        }
    }
};

const machine = xstate.Machine({
    id: 'ghost',
    initial: 'setup',
    states: {
        setup: {
            type: 'parallel',
            states: {
                player1: {
                    initial: 'player_setup',
                    states: {
                        player_setup: {

                            invoke: {
                                src: player_setup_machine('player1'),
                                data: { parent_ctx: ctx => ctx, player_slot: 'player1' },
                                onDone: 'player_setup_done'
                            },

                        },
                        player_setup_done: {type: 'final'}
                    },
                },
                player2: {
                    initial: 'player_setup',
                    states: {
                        player_setup: {

                            invoke: {
                                src: player_setup_machine('player2'),
                                data: { parent_ctx: ctx => ctx, player_slot: 'player2' },
                                onDone: 'player_setup_done'
                            },
                            
                        },
                        player_setup_done: {type: 'final'}
                    }
                }
            },
            onDone: 'role_requests_taken'
        },
        role_requests_taken: {
            onEntry: 'conflict_evaluation',
            on: {
                ROLE_REQUESTED_CONFLICT: {
                    target: 'role_requested_conflict',
                    actions: 'emit_iamalreadytracer'
                },
                ROLE_REQUESTED_NO_CONFLICT: {
                    target: 'roles_assigned',
                    actions: 'emit_you_are_it'
                }
            }
        },
        role_requested_conflict: {
            onEntry: 'cointoss_roles',
            on: {
                COIN_TOSS: {
                    target: 'roles_assigned',
                    actions: ['emit_you_are_it']
                }
            }
        },
        roles_assigned: {
            onEntry: ['call_creategame'],
            on: {
                CALL_CREATEGAME_ENDED: {
                    target: 'wait4move',
                    actions: 'emit_your_turn'
                }
            }
        },
        wait4move: {
            on: {
                SOC_MOVE: {
                    target: 'game_move',
                    actions: 'call_makemove'
                }
            }
        },
        game_move: {
            on: {
                CALL_MAKEMOVE_ENDED: {
                    target: 'move_result',
                    actions: 'emit_opponent_moved'
                }
            }
        },
        move_result: {
            onEntry: 'judge_move_results',
            on: {
                GAME_STATE_WAIT: {
                    target: 'wait4move',
                    actions: ['switch_player', 'emit_your_turn'],
                },
                GAME_STATE_OVER_DRAW: {
                    target: 'end',
                    actions: ['emit_gameover', 'call_dropgame']
                }
            }
        },
        end: {
            type: 'final'
        }
    }
});

// FIXME: extract code from this module.
function player_setup_machine( player_slot ) {
    return xstate.Machine(
        Object.assign({}, player_setup, {id: player_slot}),
        {
            actions: {
                emit_choose_role: (ctx, event) => {
                    const socket = ctx.parent_ctx.players.get(event.player_id).socket;
                    socket.emit('choose_role');
                },
                store_role_requested: (ctx, event) => {
                    ctx.parent_ctx.players.get(event.player_id).role_request = event.role;
                }
            }
        }
    );
}

module.exports = machine;