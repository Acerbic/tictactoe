/**
 * Class incapsulates reused code between tests to create "client-like" sockets
 * to connect to the ghost server.
 */

// allow step debugging
const EXTEND_SOCKET_TIMEOUTS = process.env.VSCODE_CLI ? true : false;

import ioClient from "socket.io-client";

import { API as gh_api } from "@trulyacerbic/ttt-apis/ghost-api";
import { GhostInSocket } from "./__utils";

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
                let z = playerName;
            })
            .on("reconnect", (attemptNum: any) => {
                let z = playerName;
            })
            .on("connect_error", (error: any) => {
                let z = playerName;
            })
            .on("connect_timeout", (timeout: any) => {
                let z = playerName;
            })
            .on("error", (error: any) => {
                let z = playerName;
            })
            .on("reconnect_error", (error: any) => {
                let z = playerName;
            })
            .on("reconnect_failed", () => {
                let z = playerName;
            });
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
