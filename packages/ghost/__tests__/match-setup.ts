/**
 * Simulation of incoming connections and setup of a new game.
 */

import ioClient from "socket.io-client";
import http from "http";
import ioServer from "socket.io";
import { AddressInfo } from "net";

// in case we need em
import GmasterConnector from "../src/connectors/gmaster_connector";
import { GetGameBoard } from "../src/connectors/prisma_connector";
jest.mock("../src/connectors/gmaster_connector");
jest.mock("../src/connectors/prisma_connector");

import { app } from "../src/app";
import { attachDispatcher } from "../src/socketDispatch";

describe("WS communication", () => {
    let httpServer: http.Server;
    let httpServerAddr: AddressInfo;
    let socServer: ioServer.Server;

    // keeps track of opened sockets to close them between tests
    let socketsOpened: Array<SocketIOClient.Socket>;

    // helper to open a socket communication from emulated client.
    function openClientSocket(playerId: string) {
        // Do not hardcode server port and address, square brackets are used for IPv6
        const socket = ioClient(
            `http://[${httpServerAddr.address}]:${httpServerAddr.port}`,
            {
                reconnectionDelay: 0,
                forceNew: true,
                transports: ["websocket"],
                query: {
                    playerId
                }
            }
        );
        socketsOpened.push(socket);
        return socket;
    }

    /**
     * Setup WS & HTTP servers
     */
    beforeEach(done => {
        httpServer = http.createServer(app).listen();
        // NOTE: potential problem as `httpServer.address()` is said to also return
        // `string` in some cases
        httpServerAddr = httpServer.address() as AddressInfo;
        expect(typeof httpServerAddr).toBe("object");
        socServer = ioServer(httpServer);
        attachDispatcher(socServer);

        // note: (not in official documentation tho, may change)
        // (ioServer as any).httpServer === httpServer;

        socketsOpened = [];
        done();
    });

    /**
     *  Cleanup WS & HTTP servers
     */
    afterEach(done => {
        for (let s of socketsOpened) {
            // Cleanup
            if (s.connected) {
                s.disconnect();
            }
        }
        socServer.close();
        httpServer.close();
        done();
    });

    test("player should be able to connect", done => {
        const client = openClientSocket("player");
        client.once("choose_role", (message: any) => {
            done();
        });
    }, 1000);
});
