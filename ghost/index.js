var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http, {pingTimeout: 1000000});

const statelog = require('debug')('ttt:ghost:state-machine');
const hostlog =  require('debug')('ttt:ghost')

const gs = require('global-singleton');
// safe singletons
let gameRoomsCounter = gs('ghost.GameRoomsCounter', function () { return 1; });
const GameRooms = gs('ghost.GameRooms', function () { return new Map(); });


const { createGameRoom } = require('./state-machine/state-interpreter');

// start machine interpreter
const ghost = createGameRoom()
    .onTransition((state, event) => statelog("Transition (%s) -> %O", event.type, state.value))
    .start();

hostlog('state machine started');

// attach important socket handlers
io.on('connection', function(socket) {
    ghost.on_socket_connection(socket);
});

// start listening for connections
http.listen(3060, function() {
    hostlog('ghost is listening on *:3060');
});

// Stupid CORS
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});