var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http, {pingTimeout: 1000000});

const statelog = require('debug')('ttt:ghost:state-machine');
const errorlog = require('debug')('ttt:ghost:error');
const debuglog = require('debug')('ttt:ghost:debug');

const ghost = require('./state-machine/state-interpreter');

// start machine interpreter
ghost
.onTransition((state, event) => statelog("Transition (%s) -> %O", event.type, state.value))
.start();

statelog('machine started');

// attach important socket handlers
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

    ghost.on_socket_connected(player_id, submachine_id, socket);

    // listen for further socket messages
    socket.once('iwannabetracer', (role) => 
        ghost.on_iwannabetracer(role, player_id, submachine_id)
    );

    socket.on('move', move => {
        ghost.send( {type: "SOC_MOVE", move} );
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