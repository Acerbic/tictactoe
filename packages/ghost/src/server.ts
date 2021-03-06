import { statelog, hostlog, errorlog, debuglog } from "./utils";

import { createServer } from "http";
import socketio from "socket.io";

import { app } from "./app";
import { SocketDispatcher } from "./SocketDispatcher";

/**
 * Make http server from Express app
 */
const http = createServer(app);

/**
 * Wrap http server with websocket functionality
 */
const socServer = socketio(http, {
    pingTimeout: process.env.NODE_ENV == "production" ? 3000 : 1000000,
    serveClient: false
});

/**
 * Add custom ws behaviours
 */
new SocketDispatcher(socServer);

// start listening for http connections
const ghost_port = process.env.GHOST_PORT || 3060;
http.listen(ghost_port, function () {
    hostlog(`ghost is listening on *:${ghost_port}`);
});
