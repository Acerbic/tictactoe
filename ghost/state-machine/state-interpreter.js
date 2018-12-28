const xstate = require('xstate');
const { interpret } = require('xstate/lib/interpreter');

const {state_machine, player_setup_machine} = require('./state-machine');
const gmaster = require('../connectors/gmaster_connector');
const { GetGameBoard } = require('../connectors/prisma_connector');

const statelog = require('debug')('ttt:ghost:state-machine');
const errorlog = require('debug')('ttt:ghost:error');
const debuglog = require('debug')('ttt:ghost:debug')

/**
 * Generate a machine for player preparation
 */
function player_setup() {
    return xstate.Machine(
        player_setup_machine,
        {
            actions: {
                add_player: (ctx, event) => {
                    const {player_id, submachine_id, socket} = event;
                    ctx.parent_ctx.players.set(player_id, {
                        id: player_id,
                        socket,
                        role_request: null,
                        submachine_id
                    });

                    ctx.parent_ctx[submachine_id] = player_id;
                },
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

/**
 *  Since options contain actions and some of those actions need to raise events
 *  on the state machine, they need a ready reference to the interpreter. But the
 *  interpreter itself is generated at the runtime. Thus, we need this function to
 *  "cook" a new batch of options for every new interpreter instance.
 * @param {*} _interpreter
 */
const options = {
    services: {
        submachine: player_setup(),

        /**
         * call CreateGame Rest API on game master
         */
        invoke_create_game: (ctx) => {

            if (ctx.current_player == ctx.player2) {
                [ctx.player1, ctx.player2] = [ctx.player2, ctx.player1];
            }

            return gmaster.post( 'CreateGame', { player1Id: ctx.player1, player2Id: ctx.player2 } )
                .then(response => {
                    if (response.success) {
                        ctx.latest_game_state = response.newState;
                        ctx.game_id = response.gameId;
                        return response;
                    } else {
                        return Promise.reject(response);
                    }
                });
        },

        /**
         * Call MakeMove on game master.
         */
        invoke_make_move: (ctx, event) => {
            return gmaster.post(
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
            .then ( response => {
                if (response.success) {
                    ctx.latest_game_state = response.newState;
                    return { type: "CALL_MAKEMOVE_ENDED", response };
                } else {
                    errorlog(`Call to MakeMove failed: [{response.errorCode}] - {response.errorMessage}`);
                    return Promise.reject(response);
                    // TODO: handle non-success by the game master
                }
            })
            .catch(ex => {
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
                GetGameBoard( ctx.game_id )
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
            let winner = null;
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
            gmaster.post('DropGame', {}, ctx.game_id);
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
};

/*
    PlayerId : string
    PlayerContext: {
        id: PlayerId,
        socket: Socket,
        role_request: string,
        submachine_id: string
    }
*/
const initial_context = {
    // since game master operates on 'player1' and 'player2' tokens
    // we need to keep mapping of those to player ids.
    player1: null,
    player2: null,

    // id of the current player (the one who's turn is next)
    current_player: null,

    // game id in gamesDB
    game_id: null,

    // latest game state, reported after a move was accepted by game master
    latest_game_state: null,

    players: null, // Map: PlayerId => PlayerContext

    // Used to synchronize calls to socket.emit (state transitions
    // could cause racing in actions, if action is delaying emit to the
    // later time)
    emits_sync: Promise.resolve()
}

/**
 * starts up a separate game room to host a game
 */
function createGameRoom() {

    const _interpreter = interpret(xstate.Machine(
        state_machine,
        options,
        Object.assign({}, initial_context, {players: new Map()})
    ));

    // extending interpreter for our use case
    /**
     * New socket connecting to this interpreter
     */
    _interpreter.on_socket_connection = function (socket) {
        // check connection query arguments
        const player_id = socket.handshake.query.playerId;
        if (!player_id) {
            errorlog("Socket tried to connect without player ID. Refusing.");
            socket.disconnect(true);
            return;
        }
        debuglog(`a user with id = ${player_id} connecting: ${socket.id}`);

        const context = _interpreter.state.context;
        if (context.players.size >= 2) {
            // two players have already connected to the game. reject this connection!
            errorlog('too many players %s. Refusing.', socket.id);
            socket.disconnect(true);
            return;
        }

        const submachine_id = 'player' + (context.players.size + 1);

        // attach variety of socket event handlers
        socket.on('disconnect', function() {
            debuglog('user disconnected (id=%s), socket=%s', player_id, socket.id);
        });

        // listen for further socket messages

        socket.once('iwannabetracer', (role) => {
            // raise machine EVENT
            _interpreter.sendTo({
                type: "SOC_IWANNABETRACER",
                player_id,
                role
            }, submachine_id)
            statelog("New state: %O", _interpreter.state.value);
        });

        socket.on('move', move => {
            _interpreter.send( {type: "SOC_MOVE", move} );
        });

        // raise machine EVENT - SOC_CONNECT
        debuglog("User %s connected as %s", player_id, submachine_id);
        _interpreter.sendTo({
            type: "SOC_CONNECT",
            player_id,
            socket,
            submachine_id
        }, submachine_id)
        statelog("New state: %O", _interpreter.state.value);
    };

    /**
     * Number of players already connected to this room
     */
    _interpreter.playersCount = () =>
         (_interpreter.state) ?  _interpreter.state.context.players.size : 0;

    return _interpreter;
}

module.exports = { createGameRoom };