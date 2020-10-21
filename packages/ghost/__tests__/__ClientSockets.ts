/**
 * Class incapsulates reused code between tests to create "client-like" sockets
 * to connect to the ghost server.
 */

// allow step debugging
const EXTEND_SOCKET_TIMEOUTS = process.env.VSCODE_CLI ? true : false;

import ioClient from "socket.io-client";
import { errorlog, debuglog } from "../src/utils";

import { API as gh_api } from "@trulyacerbic/ttt-apis/ghost-api";
import { GhostInSocket, socListen, socListenAfter } from "./__utils";

export default class ClientSockets {
    // keeps track of opened sockets to close them between tests
    socketsOpened: Array<SocketIOClient.Socket> = [];

    constructor(public sockerServerURL: string) {}

    /**
     *  Creates a new socket ready to connect (but not connected yet) with
     *  specified query arguments
     */
    public openClientSocket(playerName: string, token?: string): GhostInSocket {
        const query: gh_api["connection"] = {
            playerName
        };
        if (token) {
            query.token = token;
        }

        // Do not hardcode server port and address, square brackets are used for IPv6
        const socket = ioClient(this.sockerServerURL, {
            reconnection: false, // <-- assume connection reliable during testing
            forceNew: true, // <-- simulate several distinct connection sources
            transports: ["websocket"],
            autoConnect: false,
            timeout: EXTEND_SOCKET_TIMEOUTS ? 1000000 : 20000,
            query
        });
        this.socketsOpened.push(socket);

        // for IDE debugging purposes
        socket
            .on("disconnect", (reason: any) => {
                debuglog("ClientSockets: disconnect");
            })
            .on("reconnect", (attemptNum: any) => {
                debuglog("ClientSockets: reconnect");
            })
            .on("connect_error", (error: any) => {
                errorlog("ClientSockets: Connect error for %s", playerName);
                throw error;
            })
            .on("connect_timeout", (timeout: any) => {
                debuglog("ClientSockets: connect_timeout");
            })
            .on("error", (error: any) => {
                errorlog("ClientSockets: Error for %s", playerName);
                throw error;
            })
            .on("reconnect_error", (error: any) => {
                errorlog("ClientSockets: Reconnect error for %s", playerName);
                throw error;
            })
            .on("reconnect_failed", () => {
                debuglog("ClientSockets: reconnect_failed");
            });

        // helper methods that don't exist in Socket but are useful
        // for testing.
        (socket as GhostInSocket).listen = (msg, pred?) =>
            socListen(socket as GhostInSocket, msg, pred);
        (socket as GhostInSocket).listenAfter = (after, msg, pred?) =>
            socListenAfter(after, socket as GhostInSocket, msg, pred);
        return socket as GhostInSocket;
    }

    /**
     * Disconnect all opened sockets
     */
    public cleanUp() {
        this.socketsOpened.forEach(s => {
            // Cleanup
            if (s.connected) {
                s.disconnect();
            }
        });
    }
}
