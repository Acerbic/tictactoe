var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

const StateMachine = require('./state-machine');
const { interpret } = require('xstate/lib/interpreter');

const state = interpret(StateMachine).
    withContext({
        player1: null,
        player2: null,
        current_player: 'player1',
        game_id: null,
        latest_game_state: null,
        role_request_p1: null,
        role_request_p2: null
    })

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket) {
    console.log('a user connected: ' + socket.id);
    socket.on('disconnect', function(){
        console.log('user disconnected' + socket.id);
    });

    state.send({
        type: "SOC_CONNECT",
        socket
    })

    socket.once('iwannabetracer', function (data) {
        state.send({
            type: "SOC_IWANNABETRACER",
            role: date
        })
    })
});

http.listen(3060, function(){
    console.log('ghost is listening on *:3060');
});