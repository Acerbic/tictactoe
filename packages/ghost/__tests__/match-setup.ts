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
        client.connect();
    }, 1000);

    test("2 player can complete setup separately", done => {
        const client1 = openClientSocket("p1");

        client1.once("choose_role", () => {
            client1.emit("iwannabetracer", "first");
            const client2 = openClientSocket("p2");

            client2.once("choose_role", () => {
                client2.emit("iwannabetracer", "second");
            });
            client2.connect();

            const p1_done = new Promise(resolve => {
                client1.once("you_are_it", (role: unknown) => {
                    expect(role).toBe("first");
                    client1.once("your_turn", () => resolve());
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
        client1.connect();
    });

    test("2 player can complete setup in parallel", done => {
        const client1 = openClientSocket("p1");

        client1.once("choose_role", () => {
            const client2 = openClientSocket("p2");
            client2.once("choose_role", () => {
                client1.emit("iwannabetracer", "first");
                client2.emit("iwannabetracer", "second");
            });
            client2.connect();

            const p1_done = new Promise(resolve => {
                client1.once("you_are_it", (role: unknown) => {
                    expect(role).toBe("first");
                    client1.once("your_turn", () => resolve());
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
        client1.connect();
    });

    test("role conflict is resolved", done => {
        const client1 = openClientSocket("p1");

        client1.once("choose_role", () => {
            const client2 = openClientSocket("p2");
            client2.once("choose_role", () => {
                client1.emit("iwannabetracer", "first");
                client2.emit("iwannabetracer", "first");
            });
            client2.connect();

            let role_1: string, role_2: string;
            const p1_done = new Promise(resolve => {
                client1.once("you_are_it", (role: string) => {
                    role_1 = role;
                    resolve();
                });
            });
            const p2_done = new Promise(resolve => {
                client2.once("you_are_it", (role: string) => {
                    role_2 = role;
                    resolve();
                });
            });

            Promise.all([p1_done, p2_done]).then(() => {
                expect([role_1, role_2]).toContain("first");
                expect([role_1, role_2]).toContain("second");
                done();
            });
        });
        client1.connect();
    });

    test("disallow the same player have 2 connections simultaneously", done => {
        const client1 = openClientSocket("p1");

        client1.once("choose_role", () => {
            const client2 = openClientSocket("p1");
            client2.once("disconnect", () => done());
            client2.once("choose_role", () => {
                fail(
                    "Can't have second connection opened with the same playerId"
                );
                done();
            });
            client2.connect();
        });
        client1.connect();
    });

    test("player can quit before the game start and another player take his place", done => {
        let client1 = openClientSocket("p1");
        client1.once("choose_role", () => {
            const client2 = openClientSocket("p2");
            client2.once("choose_role", () => {
                client2.emit("iwannabetracer", "second");
                client1.disconnect();

                const client3 = openClientSocket("p3");
                client3.once("choose_role", () => {
                    client3.emit("iwannabetracer", "first");

                    const p3_done = new Promise(resolve => {
                        client3.once("you_are_it", (role: unknown) => {
                            expect(role).toBe("first");
                            client3.once("your_turn", () => resolve());
                        });
                    });
                    const p2_done = new Promise(resolve => {
                        client2.once("you_are_it", (role: unknown) => {
                            expect(role).toBe("second");
                            resolve();
                        });
                    });

                    Promise.all([p3_done, p2_done]).then(() => {
                        const client1_again = openClientSocket("p1");
                        client1_again.once("choose_role", () => done());
                        client1_again.connect();
                    });
                });
                client3.connect();
            });
            client2.connect();
        });

        client1.connect();
    });
});
