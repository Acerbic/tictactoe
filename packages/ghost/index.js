const app = require("express")();
const http = require("http").Server(app);
const io = require("socket.io")(http, {
  pingTimeout: process.env.NODE_ENV == "production" ? 3000 : 1000000
});
const {
  GameRoomInterpreter
} = require("./dist/state-machine/game-room-machine");

const statelog = require("debug")("ttt:ghost:state-machine");
const hostlog = require("debug")("ttt:ghost");

const gs = require("global-singleton");

const deps = {
  gmaster: new (require("./dist/connectors/gmaster_connector"))(),
  prisma: require("./dist/connectors/prisma_connector").GetGameBoard
};

// safe singletons
// let gameRoomsCounter = gs('ghost.GameRoomsCounter', function () { return 1; });
const GameRooms = gs("ghost.GameRooms", function() {
  return new Map();
});

let waitingRoom = new GameRoomInterpreter(deps);
waitingRoom
  .onTransition(
    (r => (state, event) =>
      statelog(
        "Transition in room {%s}: (%s) -> %O",
        r.id,
        event.type,
        state.value
      ))(waitingRoom)
  )
  .start();

hostlog("game room created: %s", waitingRoom.id);

// attach important socket handlers
io.on("connection", function(socket) {
  // TODO: auth
  const player_id = socket.handshake.query.playerId;

  if (GameRooms.has(player_id)) {
    // reconnection to the game
    // TODO:
  } else {
    // connect the player to existing room
    waitingRoom.on_socket_connection(socket);
    GameRooms.set(player_id, waitingRoom);

    // if the room is full, create a new room for future players
    if (waitingRoom.playersCount() >= 2) {
      waitingRoom = new GameRoomInterpreter(deps);
      waitingRoom
        .onTransition(
          (r => (state, event) =>
            statelog(
              "Transition in room {%s}: (%s) -> %O",
              r.id,
              event.type,
              state.value
            ))(waitingRoom)
        )
        .start();
      hostlog("game room created: %s", waitingRoom.id);
    }
  }
});

// start listening for connections
http.listen(3060, function() {
  hostlog("ghost is listening on *:3060");
});

// Stupid CORS
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});
