const xstate = require('xstate');

const player_setup = {
    initial: 'wait4client',
    states: {
        wait4client: {
            on: {
                SOC_CONNECT: {
                    target: 'wait4rolepick',
                    actions: 'emit_choose_role'
                }
            }
        },
        waite4rolepick: {
            on: {
                SOC_IWANNABETRACER: {
                    target: 'rolerequested',
                    action: 'store_role_requested'
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
                    ...player_setup
                },
                player2: {
                    ...player_setup
                }
            },
            onDone: 'role_requests_taken'
        },
        role_requests_taken: {
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
            on: {
                COIN_TOSS: {
                    target: 'roles_assigned',
                    actions: ['store_roles_assigned', 'emit_you_are_it']
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

module.exports = machine;