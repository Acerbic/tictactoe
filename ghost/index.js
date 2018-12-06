var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);


const statelog = require('debug')('ttt:ghost:state-machine');
const errorlog = require('debug')('ttt:ghost:error');
const debuglog = require('debug')('ttt:ghost:debug')

const StateMachine = require('./state-machine');
const { interpret } = require('xstate/lib/interpreter');
const gmaster = require('./gmaster_connector');

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
        player2_role_request: null
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
                ctx.player1_socket.emit('iamalreadytracer');
                ctx.player2_socket.emit('iamalreadytracer');
            },

            emit_you_are_it: (ctx) => {
                ctx.player1_socket.emit('you_are_it', 'first');
                ctx.player2_socket.emit('you_are_it', 'second');
            },

            cointoss_roles: (ctx) => {
                if (Math.random() > 0.5) {
                    [ctx.player1_socket, ctx.player2_socket] = [ctx.player2_socket, ctx.player1_socket];
                    [ctx.player1, ctx.player2] = [ctx.player2, ctx.player1];
                }
                ghost.send({type: "COIN_TOSS"});
            },

            call_creategame: (ctx) => {
                gmaster.get(
                    'CreateGame',
                    { player1Id: ctx.player1, player2Id: ctx.player2 }
                )
                .then( response => ghost.send({ type: "CALL_CREATEGAME_ENDED", response }))
                .catch(ex => {
                    errorlog("Exceptional thing happened: %o", ex);
                });
            },

            emit_your_turn: (ctx) => {
                const socket = ctx[`${ctx.current_player}_socket`];
                socket.emit('your_turn');
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

    debuglog('a user connected: ' + socket.id);
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
    context[player_slot] = player_slot == 'player1' ? 123 : 345;

    // raise machine EVENT
    ghost.sendTo({
        type: "SOC_CONNECT",
        player_slot
    }, player_slot)

    statelog("New state: %O", ghost.state.value);
    statelog("P1 state: %O", ghost.children.get('player1').state.value);
    statelog("P2 state: %O", ghost.children.get('player2').state.value);

    // listen for further socket messages
    socket.once('iwannabetracer', function (data) {
        // raise machine EVENT
        ghost.sendTo({
            type: "SOC_IWANNABETRACER",
            role: data
        }, player_slot)

        statelog("New state: %O", ghost.state.value);
    })

    // socket.on('move', move => {
    //     ghost.send( { type: "SOC_MOVE", move } );
    // });

});

http.listen(3060, function(){
    console.log('ghost is listening on *:3060');
});