const player_setup_machine = {
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
            type: 'final'
        }
    }
};

const state_machine = {
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
                                id: 'player1',
                                src: 'submachine',
                                data: { parent_ctx: ctx => ctx },
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
                                id: 'player2',
                                src: 'submachine',
                                data: { parent_ctx: ctx => ctx },
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
            on: {
                '': [
                    {
                        cond: 'role_requests_conflict',
                        target: 'role_requested_conflict',
                        actions: 'emit_iamalreadytracer'
                    },
                    {
                        target: 'roles_assigned',
                        actions: ['set_current_player', 'emit_you_are_it']
                    }
                ],
            }
        },
        role_requested_conflict: {
            onEntry: 'cointoss_roles',
            on: {
                '': {
                    target: 'roles_assigned',
                    actions: ['emit_you_are_it']
                }
            }
        },
        roles_assigned: {
            invoke: {
                src: 'invoke_create_game',
                onDone: {
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
            invoke: {
                src: 'invoke_make_move',
                onDone: {
                    target: 'move_result',
                    actions: 'emit_opponent_moved'
                }
            }
        },
        move_result: {
            on: {
                '': [
                    {
                        cond: ctx => ctx.latest_game_state.game == 'wait',
                        target: 'wait4move',
                        actions: ['switch_player', 'emit_your_turn']
                    },
                    {
                        cond: ctx => (
                            ctx.latest_game_state.game == 'over' 
                            || ctx.latest_game_state.game == 'draw'
                        ),
                        target: 'end',
                        actions: ['emit_gameover', 'call_dropgame']
                    }
                ],
            }
        },
        end: {
            type: 'final'
        }
    }
};

module.exports = {state_machine, player_setup_machine};