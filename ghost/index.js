var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http, {pingTimeout: 1000000});

const statelog = require('debug')('ttt:ghost:state-machine');
const errorlog = require('debug')('ttt:ghost:error');
const debuglog = require('debug')('ttt:ghost:debug')

const StateMachine = require('./state-machine');
const { interpret } = require('xstate/lib/interpreter');
const gmaster = require('./gmaster_connector');
const { GetGameBoard } = require('./prisma_connector');

statelog('machine loaded');

/*
    PlayerId : string
    PlayerContext: {
        id: PlayerId,
        socket: Socket,
        role_request: string,
        submachine_id: string
    }

 */


// start state machine
const ghost = interpret(
    // with the initial context
    StateMachine.withContext({

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

        players: new Map(), // PlayerId => PlayerContext

        // Used to synchronize calls to socket.emit (state transitions
        // could cause racing in actions, if action is delaying emit to the
        // later time)
        emits_sync: Promise.resolve()
    })
    .withConfig({
        actions: {
            /**
             * compare roles requested by players and either raise
             * ROLE_REQUESTED_CONFLICT or ROLE_REQUESTED_NO_CONFLICT.
             * Determines ctx.current_player
             */
            conflict_evaluation: (ctx) => {
                const it = ctx.players.values();
                const p1 = it.next().value;
                const p2 = it.next().value;

                if (p1.role_request === p2.role_request) {
                    ghost.send({type: "ROLE_REQUESTED_CONFLICT"});
                } else {
                    ctx.current_player = (p1.role_request == 'second') ? p2.id : p1.id;
                    ghost.send({type: "ROLE_REQUESTED_NO_CONFLICT"});
                }
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
                ghost.send({type: "COIN_TOSS"});
            },

            /**
             * call CreateGame Rest API on game master
             */
            call_creategame: (ctx) => {

                if (ctx.current_player == ctx.player2) {
                    [ctx.player1, ctx.player2] = [ctx.player2, ctx.player1];
                }

                gmaster.post(
                    'CreateGame',
                    { player1Id: ctx.player1, player2Id: ctx.player2 }
                )
                .then( response => {
                    if (response.success) {
                        ctx.latest_game_state = response.newState;
                        ctx.game_id = response.gameId;
                        ghost.send({ type: "CALL_CREATEGAME_ENDED", response })
                    } else {
                        // TODO:
                    }
                })
                .catch(ex => {
                    errorlog("Exceptional thing happened: %o", ex);
                });
            },

            /**
             * Send 'your_turn' to a client
             */
            emit_your_turn: (ctx) => {
                debuglog("action: emit your turn")
                // const socket = ctx[`${ctx.current_player}_socket`];
                const socket = ctx.players.get(ctx.current_player).socket;
                ctx.emits_sync.then( () => {
                    debuglog("actually emitting your turn");
                    socket.emit('your_turn');
                });
            },

            /**
             * Call MakeMove on game master. Upon completion, this will raise
             * CALL_MAKEMOVE_ENDED event with the response from game master
             */
            call_makemove: (ctx, event) => {
                gmaster.post(
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
                        ghost.send({ type: "CALL_MAKEMOVE_ENDED", response });
                    } else {
                        errorlog(`Call to MakeMove failed: [{response.errorCode}] - {response.errorMessage}`);
                        // TODO: handle non-success by the game master
                    }
                })
                .catch(ex => {
                    errorlog("Exceptional thing happened: %o", ex);
                });
            },

            emit_opponent_moved: (ctx) => {
                const it = ctx.players.values();
                const p1 = it.next().value;
                const p2 = it.next().value;

                const socket_waiting = ctx.current_player == p1.id ? p2.socket : p1.socket;
                const socket_moving = ctx.players.get(ctx.current_player).socket;

                debuglog("attaching GGB promise");
                ctx.emits_sync = ctx.emits_sync
                .then ( () => 
                    GetGameBoard( ctx.game_id )
                    .then( board => {
                        debuglog(" GGB resolved. attaching op_moved emit");
                        const turn = ctx[ctx.latest_game_state.turn];
                        return new Promise( (resolve, reject) =>
                            {
                                debuglog("emitting op_moved");
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

            judge_move_results: (ctx) => {
                debuglog("judge_move_result");
                switch (ctx.latest_game_state.game) {
                    case 'wait':
                        ghost.send({
                            type: 'GAME_STATE_WAIT'
                        });
                        break;
                    case 'over':
                    case 'draw':
                        ghost.send({
                            type: 'GAME_STATE_OVER_DRAW'
                        })
                }
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
        }
    })
)
.onTransition((state, event) => statelog("Transition (%s) -> %O", event.type, state.value))
.start();

statelog('machine started');

io.on('connection', function(socket) {

    const player_id = socket.handshake.query.playerId;
    if (!player_id) {
        errorlog("Socket tried to connect without player ID. Refusing.");
        socket.disconnect(true);
        return;
    }
    debuglog(`a user with id = {player_id} connecting: {socket.id}`);

    const context = ghost.state.context;
    if (context.players.size >= 2) {
        // two players have already connected to the game. reject this connection!
        errorlog('too many players %s. Refusing.', socket.id);
        socket.disconnect(true);
        return;
    }

    socket.on('disconnect', function() {
        debuglog('user disconnected (id=%s), socket=%s', player_id, socket.id);
    });

    const submachine_id = 'player' + (context.players.size + 1);
    context.players.set(player_id, {
        id: player_id,
        socket,
        role_request: null,
        submachine_id
    });

    context[submachine_id] = player_id;
    debuglog("User %s connected as %s", player_id, submachine_id);

    // raise machine EVENT
    ghost.sendTo({
        type: "SOC_CONNECT",
        player_id,
    }, submachine_id)

    statelog("New state: %O", ghost.state.value);

    // listen for further socket messages
    socket.once('iwannabetracer', function (data) {
        // raise machine EVENT
        ghost.sendTo({
            type: "SOC_IWANNABETRACER",
            player_id,
            role: data
        }, submachine_id)

        statelog("New state: %O", ghost.state.value);
    })

    socket.on('move', move => {
        ghost.send( { type: "SOC_MOVE", move} );
    });
});

http.listen(3060, function() {
    console.log('ghost is listening on *:3060');
});

// Stupid CORS
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});