import { statelog, hostlog, errorlog, debuglog } from "./utils";

import { createServer } from "http";
import cors from "cors";
import socketio from "socket.io";

import { app } from "./app";
import { SocketDispatcher } from "./SocketDispatcher";

/**
 * Make http server from Express app
 */
// app.use(
//     cors({
//         origin: "*"
//     })
// );
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
new SocketDispatcher().attach(socServer);

// start listening for http connections
const ghost_port = process.env.GHOST_PORT || 3060;
http.listen(ghost_port, function () {
    hostlog(`ghost is listening on *:${ghost_port}`);
});
