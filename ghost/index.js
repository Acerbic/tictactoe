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
// start state machine
const ghost = interpret(
    // with the initial context
    StateMachine.withContext({
        // players' sockets
        player1_socket: null,
        player2_socket: null,
        // players' ids
        player1: null,
        player2: null,
        current_player: 'player1',
        game_id: null,
        latest_game_state: null,
        player1_role_request: null,
        player2_role_request: null,

        // Used to synchronize calls to socket.emit (state transitions
        // could cause racing in actions, if action is delaying emit to the
        // later time)
        emits_sync: Promise.resolve()
    })
    .withConfig({
        actions: {
            conflict_evaluation: (ctx) => {
                if (ctx.player1_role_request == ctx.player2_role_request) {
                    ghost.send({type: "ROLE_REQUESTED_CONFLICT"});
                } else {
                    if (ctx.player1_role_request == 'second') {
                        [ctx.player1_socket, ctx.player2_socket] = [ctx.player2_socket, ctx.player1_socket];
                        [ctx.player1, ctx.player2] = [ctx.player2, ctx.player1];
                    };
                    ghost.send({type: "ROLE_REQUESTED_NO_CONFLICT"});
                }
            },

            emit_iamalreadytracer: (ctx) => {
                ctx.emits_sync.then( () => {
                    ctx.player1_socket.emit('iamalreadytracer');
                    ctx.player2_socket.emit('iamalreadytracer');
                });
            },

            emit_you_are_it: (ctx) => {
                ctx.emits_sync.then( () => {
                    ctx.player1_socket.emit('you_are_it', 'first');
                    ctx.player2_socket.emit('you_are_it', 'second');
                });
            },

            cointoss_roles: (ctx) => {
                if (Math.random() > 0.5) {
                    [ctx.player1_socket, ctx.player2_socket] = [ctx.player2_socket, ctx.player1_socket];
                    [ctx.player1, ctx.player2] = [ctx.player2, ctx.player1];
                }
                ghost.send({type: "COIN_TOSS"});
            },

            attach_remaining_listeners: (ctx) => {
                // attaching socket listeners here, since we only now know who
                // is player 1 and who is player 2...
                ctx.player1_socket.on('move', move => {
                    ghost.send( { type: "SOC_MOVE", move, player_slot: 'player1' } );
                });
                ctx.player2_socket.on('move', move => {
                    ghost.send( { type: "SOC_MOVE", move, player_slot: 'player2' } );
                });
            },

            call_creategame: (ctx) => {
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

            emit_your_turn: (ctx) => {
                debuglog("action: emit your turn")
                const socket = ctx[`${ctx.current_player}_socket`];
                ctx.emits_sync.then( () => {
                    debuglog("actually emitting your turn");
                    socket.emit('your_turn');
                });
            },

            call_makemove: (ctx, event) => {
                gmaster.post(
                    'MakeMove',
                    {
                        playerId: ctx[`${ctx.current_player}`],
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
                const player = ctx.current_player == 'player1' ? 'player2' : 'player1';
                const socket_waiting = ctx[`${player}_socket`];
                const socket_moving = ctx[`${ctx.current_player}_socket`];

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
                ctx.current_player = ctx.current_player == 'player1' ? 'player2' : 'player1';
            },

            emit_gameover: (ctx) => {
                let winner = null;
                if (ctx.latest_game_state.game == 'over') {
                    winner = ctx[ctx.latest_game_state.turn];
                }

                ctx.emits_sync.then( () => {

                    ctx.player1_socket.emit('gameover', {winner});
                    ctx.player2_socket.emit('gameover', {winner});

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

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket) {

    debuglog('a user with id = ' + socket.handshake.query.playerId + ' connected: ' + socket.id);
    socket.on('disconnect', function() {
        debuglog('user disconnected' + socket.id);
    });

    // select a player slot to connect to.
    const context = ghost.state.context;
    const player_slot = context.player1_socket == null ? 'player1' : (
        context.player2_socket == null ? 'player2' : null
    );

    if (!player_slot) {
        // two players have already connected to the game. reject this connection!
        errorlog('too many connections %s', socket.id);
        socket.disconnect(true);
        return;
    }

    // remember this socket
    context[`${player_slot}_socket`] = socket;
    // and this player NOTE: typically you id the user and load him from DB.
    context[player_slot] = socket.handshake.query.playerId;
    debuglog("User " + socket.handshake.query.playerId + " connected as " + player_slot);

    // raise machine EVENT
    ghost.sendTo({
        type: "SOC_CONNECT",
        player_slot
    }, player_slot)

    statelog("New state: %O", ghost.state.value);

    // listen for further socket messages
    socket.once('iwannabetracer', function (data) {
        // raise machine EVENT
        ghost.sendTo({
            type: "SOC_IWANNABETRACER",
            role: data
        }, player_slot)

        statelog("New state: %O", ghost.state.value);
    })

});

http.listen(3060, function(){
    console.log('ghost is listening on *:3060');
});

// Stupid CORS
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});