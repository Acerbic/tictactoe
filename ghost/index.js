var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
const debug = require('debug')('ttt:ghost:state-machine');

const StateMachine = require('./state-machine');
const { interpret } = require('xstate/lib/interpreter');

debug('machine loaded');
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
    .withConfig({})
)
.onTransition((state, event) => debug("Transition (%s) -> %O", event.type, state.value))
.start();

debug('machine started');

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket) {
    console.log('a user connected: ' + socket.id);
    socket.on('disconnect', function() {
        console.log('user disconnected' + socket.id);
    });

    // select a player slot to connect to.
    const context = ghost.state.context;
    const player_slot = context.player1_socket == null ? 'player1' : (
        context.player2_socket == null ? 'player2' : null
    );

    if (!player_slot) {
        // two players have already connected to the game. reject this connection!
        debug('too many connections %s', socket.id);
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

    debug("New state: %O", ghost.state.value);
    debug("P1 state: %O", ghost.children.get('player1').state.value);
    debug("P2 state: %O", ghost.children.get('player2').state.value);

    // listen for further socket messages
    socket.once('iwannabetracer', function (data) {
        // raise machine EVENT
        ghost.sendTo({
            type: "SOC_IWANNABETRACER",
            role: data
        }, player_slot)

        debug("New state: %O", ghost.state.value);
        // subscribe for further events...
    })
});

http.listen(3060, function(){
    console.log('ghost is listening on *:3060');
});