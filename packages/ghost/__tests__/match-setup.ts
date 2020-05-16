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
        new SocketDispatcher().attach(socServer);

        // note: (not in official documentation tho, may change)
        // (ioServer as any).httpServer === httpServer;

        socketsOpened = [];
        done();
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

    test("player should be able to connect", done => {
        const client = openClientSocket("player");
        client.once("choose_role", (message: any) => {
            done();
        });
    }, 1000);

    test("2 player can complete setup separately", done => {
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

        const client1 = openClientSocket("p1");

        client1.once("choose_role", () => {
            client1.emit("iwannabetracer", "first");
            const client2 = openClientSocket("p2");

            client2.once("choose_role", () => {
                client2.emit("iwannabetracer", "second");
            });

            const p1_done = new Promise(resolve => {
                client1.once("you_are_it", (role: unknown) => {
                    expect(role).toBe("first");
                    resolve();
                });
            });
            const p2_done = new Promise(resolve => {
                client2.once("you_are_it", (role: unknown) => {
                    expect(role).toBe("second");
                    resolve();
                });
            });

            Promise.all([p1_done, p2_done]).then(() => done());
        });
    });

    test("2 player can complete setup in parallel", done => {
        mocked_gmc_post.mockImplementationOnce(endpoint => {
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

        const client1 = openClientSocket("p1");

        client1.once("choose_role", () => {
            const client2 = openClientSocket("p2");
            client2.once("choose_role", () => {
                client1.emit("iwannabetracer", "first");
                client2.emit("iwannabetracer", "second");
            });

            const p1_done = new Promise(resolve => {
                client1.once("you_are_it", (role: unknown) => {
                    expect(role).toBe("first");
                    resolve();
                });
            });
            const p2_done = new Promise(resolve => {
                client2.once("you_are_it", (role: unknown) => {
                    expect(role).toBe("second");
                    resolve();
                });
            });

            Promise.all([p1_done, p2_done]).then(() => done());
        });
    });
});
