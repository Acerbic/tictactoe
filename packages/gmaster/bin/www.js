#!/usr/bin/env node

/**
 * Module dependencies.
 */

var generateApp = require("../dist/app").default;
var debuglog = require("debug")("gmaster:server");
var http = require("http");

var app = generateApp();

/**
 * Get port from environment and store in Express.
 */

var port = normalizePort(process.env.GMASTER_PORT || "3000");
app.set("port", port);

/**
 * Create HTTP server.
 */

var server = http.createServer(app);

/**
 * Regular tasks (instead of cron)
 */
var daily = setInterval(() => {
    var connector = app.get("gamesDb");
    connector && typeof connector.Upkeep === "function" && connector.Upkeep();
}, 1000 * 60 * 60 * 24);
server.on("close", () => {
    clearInterval(daily);
});

/**
 * Listen on provided port, on all network interfaces.
 */
server.on("error", onError);
server.on("listening", onListening);
server.listen(port);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
    var port = parseInt(val, 10);

    if (isNaN(port)) {
        // named pipe
        return val;
    }

    if (port >= 0) {
        // port number
        return port;
    }

    return false;
}

/**
 * Event listener for HTTP server "error" event.
 * @see https://nodejs.org/docs/latest-v14.x/api/net.html#net_event_error
 */
function onError(error) {
    if (error.syscall !== "listen") {
        throw error;
    }

    var bind = typeof port === "string" ? "Pipe " + port : "Port " + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case "EACCES":
            console.error(bind + " requires elevated privileges");
            process.exit(1);
            break;
        case "EADDRINUSE":
            console.error(bind + " is already in use");
            process.exit(1);
            break;
        default:
            throw error;
    }
}

/**
 * Event listener for HTTP server "listening" event.
 * @see https://nodejs.org/docs/latest-v14.x/api/net.html#net_event_listening
 */
function onListening() {
    var addr = server.address();
    var bind = typeof addr === "string" ? "pipe " + addr : "port " + addr.port;
    debuglog("Listening on " + bind);
}
