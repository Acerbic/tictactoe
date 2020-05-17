/**
 * Simulation of incoming connections and setup of a new game.
 */

// allow step debugging
const EXTEND_SOCKET_TIMEOUTS = process.env.VSCODE_CLI ? true : false;

import ioClient from "socket.io-client";
import http from "http";
import ioServer from "socket.io";
import { AddressInfo } from "net";

// in case we need em
import GmasterConnector from "../src/connectors/gmaster_connector";
import { GetGameBoard } from "../src/connectors/prisma_connector";
import * as gm_api from "../src/connectors/gmaster_api";
jest.mock("../src/connectors/gmaster_connector");
jest.mock("../src/connectors/prisma_connector");

/**
 * Destructuring + casting
 *
 * provides entry points to mock GmasterConnector's post and get fields
 */
const {
    post: mocked_gmc_post,
    get: mocked_gmc_get
} = new GmasterConnector() as {
    post: jest.MockedFunction<GmasterConnector["post"]>;
    get: jest.MockedFunction<GmasterConnector["get"]>;
};

import { app } from "../src/app";
import { SocketDispatcher } from "../src/SocketDispatcher";

describe("After game started", () => {
    let httpServer: http.Server;
    let httpServerAddr: AddressInfo;
    let socServer: ioServer.Server;
    let client1: SocketIOClient.Socket;
    let client2: SocketIOClient.Socket;

    // keeps track of opened sockets to close them between tests
    let socketsOpened: Array<SocketIOClient.Socket>;

    // helper to open a socket communication from emulated client.
    function openClientSocket(playerId: string): SocketIOClient.Socket {
        // Do not hardcode server port and address, square brackets are used for IPv6
        const socket = ioClient(
            `http://[${httpServerAddr.address}]:${httpServerAddr.port}`,
            {
                reconnection: false, // <-- assume connection reliable during testing
                forceNew: true, // <-- simulate several distinct connection sources
                transports: ["websocket"],
                autoConnect: false,
                timeout: EXTEND_SOCKET_TIMEOUTS ? 1000000 : 20000,
                query: {
                    playerId
                }
            }
        );
        socketsOpened.push(socket);
        socket
            .on("disconnect", (reason: any) => {
                let z = playerId;
            })
            .on("reconnect", (attemptNum: any) => {
                let z = playerId;
            })
            .on("connect_error", (error: any) => {
                let z = playerId;
            })
            .on("connect_timeout", (timeout: any) => {
                let z = playerId;
            })
            .on("error", (error: any) => {
                let z = playerId;
            })
            .on("reconnect_error", (error: any) => {
                let z = playerId;
            })
            .on("reconnect_failed", () => {
                let z = playerId;
            });
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
        socServer = ioServer(httpServer, {
            pingTimeout: EXTEND_SOCKET_TIMEOUTS ? 1000000 : 5000
        });
        new SocketDispatcher().attach(socServer);

        // note: (not in official documentation tho, may change)
        // (ioServer as any).httpServer === httpServer;

        socketsOpened = [];
        mocked_gmc_post.mockImplementationOnce((endpoint, payload) => {
            if (endpoint === "CreateGame") {
                return Promise.resolve(<gm_api.CreateGameResponse>{
                    success: true,
                    gameId: "1111111",
                    newState: { game: "wait", turn: "player1" }
                });
            } else {
                return Promise.resolve({
                    success: false,
                    errorMessage: "Bad Endpoint",
                    errorCode: 0
                });
            }
        });

        const p1_done = new Promise(resolve => {
            client1 = openClientSocket("p1");
            client1
                .once("choose_role", () => {
                    client1.emit("iwannabetracer", "first");
                })
                .once("you_are_it", (role: unknown) => {
                    expect(role).toBe("first");
                    client1.once("your_turn", () => resolve());
                });
            client1.connect();
        });
        const p2_done = new Promise(resolve => {
            client2 = openClientSocket("p2");
            client2
                .once("choose_role", () => {
                    client2.emit("iwannabetracer", "second");
                })
                .once("you_are_it", (role: unknown) => {
                    expect(role).toBe("second");
                    resolve();
                });
            client2.connect();
        });

        Promise.all([p1_done, p2_done]).then(() => done());
    });

    /**
     *  Cleanup WS & HTTP servers
     */
    afterEach(done => {
        socketsOpened.forEach(s => {
            // Cleanup
            if (s.connected) {
                s.disconnect();
            }
        });
        socServer.close();
        httpServer.close();
        done();
    });

    test("can reconnect", done => {
        client1.once("disconnect", () => {
            client1 = openClientSocket("p1");
            client1.once("reconnection", (data: any) => {
                expect(data.step).toBe("my-turn");
                expect(data.board).toEqual([
                    [null, null, null],
                    [null, null, null],
                    [null, null, null]
                ]);
                done();
            });
            client1.connect();
        });
        client1.disconnect();
    }, 1000000);
});
