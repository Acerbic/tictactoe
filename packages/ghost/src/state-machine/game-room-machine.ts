const statelog = require('debug')('ttt:ghost:state-machine');
const errorlog = require('debug')('ttt:ghost:error');
const debuglog = require('debug')('ttt:ghost:debug')

import { Machine, StateMachine, MachineConfig, MachineOptions, EventObject } from 'xstate';
import { interpret, Interpreter } from 'xstate/lib/interpreter';

import {GameRoomContext, GameRoomSchema, GameRoomEvent} from './game-room-schema';
import player_setup from './player-setup-machine';
import GMConnector from '../connectors/gmaster_connector';
import { PrismaGetGameBoard } from '../connectors/prisma_connector';
import { CreateGameResponse } from 'ttt-gmasterREST';
import { PlayerId } from 'ttt-db';

const state_machine : MachineConfig<GameRoomContext, GameRoomSchema, GameRoomEvent> = {
    
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
                                data: { parent_ctx: (ctx : any) => ctx },
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
                                data: { parent_ctx: (ctx : any) => ctx },
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
                    target: 'game_move'
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
                        cond: (ctx : any) => ctx.latest_game_state.game == 'wait',
                        target: 'wait4move',
                        actions: ['switch_player', 'emit_your_turn']
                    },
                    {
                        cond: (ctx : any) => (
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

function generateMachineOptions(deps: any) {
    const gmaster_connector : GMConnector = deps.gmaster;
    const prisma_getGameBoard : PrismaGetGameBoard = deps.prisma;

    return <Partial<MachineOptions<GameRoomContext, GameRoomEvent>>>{
        services: {
            submachine: player_setup(),

            /**
             * call CreateGame Rest API on game master
             */
            invoke_create_game: (ctx) => {

                if (ctx.current_player == ctx.player2) {
                    [ctx.player1, ctx.player2] = [ctx.player2, ctx.player1];
                }

                return gmaster_connector.post(
                        'CreateGame', 
                        {
                            player1Id: ctx.player1,
                            player2Id: ctx.player2
                        }
                    )
                    .then( (response : CreateGameResponse) => {
                        if (response.success) {
                            ctx.latest_game_state = {
                                turn: 'player1',
                                game: 'wait'
                            };
                            ctx.game_id = response.gameId;
                            return response;
                        } else {
                            throw response;
                        }
                    });
            },

            /**
             * Call MakeMove on game master.
             */
            invoke_make_move: (ctx, event) => {

                return gmaster_connector.post(
                    'MakeMove',
                    {
                        playerId: ctx.current_player,
                        move: {
                            row: event.move.row,
                            column: event.move.column,
                        }
                    },
                    ctx.game_id
                )
                .then ( (response : CreateGameResponse) => {
                    if (response.success) {
                        ctx.latest_game_state = response.newState;
                        return { type: "CALL_MAKEMOVE_ENDED", response };
                    } else {
                        errorlog(`Call to MakeMove failed: [${response.errorCode}] - ${response.errorMessage}`);
                        throw response;
                        // TODO: handle non-success by the game master
                    }
                })
                .catch((ex : any) => {
                    errorlog("Exceptional thing happened: %o", ex);
                });
            },
        },

        actions: {
            /**
             * Initialize "current_player" context property based on
             * player's requested roles
             */
            set_current_player: (ctx) => {
                const it = ctx.players.values();
                const p1 = it.next().value;
                const p2 = it.next().value;

                ctx.current_player = (p1.role_request == 'second') ? p2.id : p1.id;
            },

            /**
             * Send 'iamalreadytracer' to both clients
             */
            emit_iamalreadytracer: (ctx) => {
                ctx.emits_sync.then( () => {
                    ctx.players.forEach( player_context => player_context.socket.emit('iamalreadytracer') );
                });
            },

            /**
             * Send 'you_are_it' to both clients
             */
            emit_you_are_it: (ctx) => {
                ctx.emits_sync.then( () => {
                    ctx.players.forEach( player_context => player_context.socket.emit(
                        'you_are_it',
                        ctx.current_player == player_context.id ? 'first' : 'second'
                    ) )
                });
            },

            /**
             * Toss a coin and decide who has the first turn
             */
            cointoss_roles: (ctx) => {
                ctx.current_player = (Math.random() > 0.5) ? ctx.player1 : ctx.player2;
            },

            /**
             * Send 'your_turn' to a client
             */
            emit_your_turn: (ctx) => {
                const socket = ctx.players.get(ctx.current_player).socket;
                ctx.emits_sync.then( () => {
                    socket.emit('your_turn');
                });
            },

            emit_opponent_moved: (ctx) => {
                const it = ctx.players.values();
                const p1 = it.next().value;
                const p2 = it.next().value;

                const socket_waiting = ctx.current_player == p1.id ? p2.socket : p1.socket;
                const socket_moving = ctx.players.get(ctx.current_player).socket;

                ctx.emits_sync = ctx.emits_sync
                .then ( () =>
                    prisma_getGameBoard( ctx.game_id )
                    .then( board => {
                        const turn = ctx[ctx.latest_game_state.turn];
                        return new Promise( (resolve, reject) =>
                            {
                                socket_waiting.emit('opponent_moved', {
                                    game_state: Object.assign({}, ctx.latest_game_state, {turn}),
                                    board
                                });
                                socket_moving.emit('meme_accepted', {
                                    game_state: Object.assign({}, ctx.latest_game_state, {turn}),
                                    board
                                });
                                resolve();
                            });
                    })
                    .catch( rejection => {
                        errorlog("GetGameBoard rejection: " + rejection);
                        // TODO: handle exception
                    })
                )
            },

            switch_player: (ctx) => {
                ctx.current_player = ctx.current_player == ctx.player1 ? ctx.player2 : ctx.player1;
            },

            emit_gameover: (ctx) => {
                let winner : PlayerId = null;
                if (ctx.latest_game_state.game == 'over') {
                    winner = ctx[ctx.latest_game_state.turn];
                }

                ctx.emits_sync.then( () => {
                    ctx.players.forEach(
                        player_context => player_context.socket.emit('gameover', {winner})
                    );
                });
            },

            call_dropgame: (ctx) => {
                this.deps.gmaster.post('DropGame', {}, ctx.game_id);
            }
        },

        guards: {
            role_requests_conflict: (ctx, event) => {
                const it = ctx.players.values();
                const p1 = it.next().value;
                const p2 = it.next().value;

                return p1.role_request === p2.role_request;
            }
        }
    }
}

const initial_context : GameRoomContext = {
    player1: null,
    player2: null,
    current_player: null,
    game_id: null,
    latest_game_state: null,
    players: null,
    emits_sync: Promise.resolve()
}

export class GameRoomInterpreter extends Interpreter<GameRoomContext, GameRoomSchema, GameRoomEvent> {
    gmaster_connector : GMConnector;

    /**
     * starts up a separate game room to host a game
     */
    constructor(deps : any) {
        super(Machine(
            state_machine,
            generateMachineOptions(deps), 
            Object.assign({}, initial_context, {players: new Map()}) as GameRoomContext
        ));
    };

    on_socket_connection(socket : any) {
        // check connection query arguments
        const player_id : PlayerId = socket.handshake.query.playerId;
        if (!player_id) {
            errorlog("Socket tried to connect without player ID. Refusing.");
            socket.disconnect(true);
            return;
        }
        debuglog(`a user with id = ${player_id} connecting: ${socket.id}`);

        const context = this.state.context;
        if (context.players.size >= 2) {
            // two players have already connected to the game. reject this connection!
            errorlog('too many players %s. Refusing.', socket.id);
            socket.disconnect(true);
            return;
        }

        const submachine_id = ('player' + (context.players.size + 1)) as 'player1' | 'player2';

        // attach variety of socket event handlers
        socket.on('disconnect', function() {
            debuglog('user disconnected (id=%s), socket=%s', player_id, socket.id);
        });

        // listen for further socket messages

        socket.once('iwannabetracer', (role : "first" | "second") => {
            // raise machine EVENT
            this.sendTo({
                type: "SOC_IWANNABETRACER",
                player_id,
                role
            }, submachine_id)
            statelog("New state: %O", this.state.value);
        });

        socket.on('move', (move : any) => {
            this.send( {type: "SOC_MOVE", move} );
        });

        // raise machine EVENT - SOC_CONNECT
        debuglog("User %s connected as %s", player_id, submachine_id);
        this.sendTo({
            type: "SOC_CONNECT",
            player_id,
            socket,
            submachine_id
        }, submachine_id);
        statelog("New state: %O", this.state.value);
    };

    playersCount = () => (this.state) ? this.state.context.players.size : 0;
}