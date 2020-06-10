/**
 * Simulation of incoming connections and setup of a new game.
 */

// allow step debugging
const EXTEND_SOCKET_TIMEOUTS = process.env.VSCODE_CLI ? true : false;

import { Socket } from "socket.io-client";
import http from "http";
import ioServer from "socket.io";
import { AddressInfo } from "net";

// in case we need em
import GmasterConnector from "../src/connectors/gmaster_connector";
jest.mock("../src/connectors/gmaster_connector");
import * as gm_api from "@trulyacerbic/ttt-apis/gmaster-api";

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
import { socListen, socListenAfter } from "./__utils";
import ClientSockets from "./__ClientSockets";

describe("WS communication", () => {
    let httpServer: http.Server;
    let httpServerAddr: AddressInfo;
    let socServer: ioServer.Server;

    let socs: ClientSockets;

    /**
     * Setup WS & HTTP servers
     */
    beforeEach(done => {
        /* remocking implementations that were reset between tests */
        mocked_gmc_post.mockImplementation(endpoint =>
            Promise.reject(<gm_api.APIResponseFailure>{
                success: false,
                errorCode: 0,
                errorMessage: "Mocked POST response for " + endpoint
            })
        );
        mocked_gmc_get.mockImplementation(endpoint =>
            Promise.reject(<gm_api.APIResponseFailure>{
                success: false,
                errorCode: 0,
                errorMessage: "Mocked GET response for " + endpoint
            })
        );

        httpServer = http.createServer(app).listen();
        // NOTE: potential problem as `httpServer.address()` is said to also return
        // `string` in some cases
        httpServerAddr = httpServer.address() as AddressInfo;
        expect(typeof httpServerAddr).toBe("object");
        socServer = ioServer(httpServer, {
            pingTimeout: EXTEND_SOCKET_TIMEOUTS ? 1000000 : 5000
        });
        new SocketDispatcher().attach(socServer);

        socs = new ClientSockets(
            `http://[${httpServerAddr.address}]:${httpServerAddr.port}`
        );

        let createdGameState;
        mocked_gmc_post.mockImplementationOnce((endpoint, payload) => {
            if (endpoint === "CreateGame") {
                createdGameState = {
                    id: "1111111",
                    player1: (payload as gm_api.CreateGameRequest).player1Id,
                    player2: (payload as gm_api.CreateGameRequest).player2Id,
                    board: [
                        [null, null, null],
                        [null, null, null],
                        [null, null, null]
                    ],
                    meta: (payload as gm_api.CreateGameRequest).meta ?? null,
                    game: "wait",
                    turn: "player1"
                };
                mocked_gmc_get.mockReset().mockResolvedValue(<
                    gm_api.CheckGameResponse
                >{
                    success: true,
                    state: createdGameState
                });
                return Promise.resolve(<gm_api.CreateGameResponse>{
                    success: true,
                    gameId: "1111111",
                    newState: createdGameState
                });
            } else {
                return Promise.reject({
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
        socs.cleanUp();
        socServer.close();
        httpServer.close();
        mocked_gmc_post.mockReset();
        mocked_gmc_get.mockReset();

        done();
    });

    test("player should be able to connect via websocket", done => {
        const client = socs.openClientSocket("player");
        client.once("connection_ack", data => {
            expect(data.isInGame).toBe(false);
            expect(data.token).not.toBeFalsy();
            done();
        });
        client.connect();
    });

    test("player can initiate new game", async () => {
        const client = socs.openClientSocket("player");
        client.connect();
        const { isInGame } = await socListen(client, "connection_ack");
        expect(isInGame).toBe(false);

        client.emit("start_game");
        await socListen(client, "choose_role");
    });

    test("2 players can complete setup separately", async () => {
        const c1 = socs.openClientSocket("p1");

        await socListenAfter(() => c1.connect(), c1, "connection_ack");
        await socListenAfter(() => c1.emit("start_game"), c1, "choose_role");
        const p1_done = new Promise(resolve => {
            // note - can't use socListenAfter().then() because messages
            // "game_start" and "update" arrive on the same tick (immediately
            // one after another), and by the time .then() is executed,
            // Socket.io would consider "update" event unhandled
            c1.once("game_started", data => {
                expect(data.role).toBe("first");
                socListen(c1, "update", d => d.turn === "player1").then(
                    resolve
                );
            });
            c1.emit("iwannabetracer", "first");
        });

        const c2 = socs.openClientSocket("p2");
        await socListenAfter(() => c2.connect(), c2, "connection_ack");
        await socListenAfter(() => c2.emit("start_game"), c2, "choose_role");
        const p2_done = socListenAfter(
            () => c2.emit("iwannabetracer", "second"),
            c2,
            "game_started"
        ).then(data => {
            expect(data.role).toBe("second");
        });

        return Promise.all([p1_done, p2_done]);
    });

    test("2 players can complete setup in parallel", async () => {
        const c1 = socs.openClientSocket("p1");
        const c2 = socs.openClientSocket("p2");

        await socListenAfter(() => c1.connect(), c1, "connection_ack");
        await socListenAfter(() => c2.connect(), c2, "connection_ack");
        await socListenAfter(() => c1.emit("start_game"), c1, "choose_role");
        await socListenAfter(() => c2.emit("start_game"), c2, "choose_role");

        const p2_done = new Promise(resolve => {
            c2.once("game_started", data => {
                expect(data.role).toBe("second");
                socListen(c2, "update", d => d.turn === "player1").then(
                    resolve
                );
            });
            c2.emit("iwannabetracer", "second");
        });

        const p1_done = new Promise(resolve => {
            c1.once("game_started", data => {
                expect(data.role).toBe("first");
                socListen(c1, "update", d => d.turn === "player1").then(
                    resolve
                );
            });
            c1.emit("iwannabetracer", "first");
        });

        Promise.all([p1_done, p2_done]);
    });

    test("role conflict is resolved", done => {
        const client1 = socs.openClientSocket("p1");
        const client2 = socs.openClientSocket("p2");

        client1.once("choose_role", () => {
            client2.once("choose_role", () => {
                client1.emit("iwannabetracer", "first");
                client2.emit("iwannabetracer", "first");
            });
            client2.once("connection_ack", () => {
                client2.emit("start_game");
            });
            client2.connect();

            let role_1: string, role_2: string;
            const p1_done = new Promise(resolve => {
                client1.once("game_started", ({ role }) => {
                    role_1 = role;
                    resolve();
                });
            });
            const p2_done = new Promise(resolve => {
                client2.once("game_started", ({ role }) => {
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

        client1.once("connection_ack", () => {
            client1.emit("start_game");
        });
        client1.connect();
    });

    test("disallow the same player have 2 connections simultaneously", done => {
        let client1_token: string;
        const client1 = socs.openClientSocket("p1");

        client1.once("choose_role", () => {
            const client2 = socs.openClientSocket("p1", client1_token);
            (client2 as typeof Socket).once("disconnect", () => done());
            client2.once("choose_role", () => {
                fail(
                    "Can't have second connection opened with the same playerId"
                );
                done();
            });
            client2.once("connection_ack", () => {
                client2.emit("start_game");
            });
            client2.connect();
        });
        client1
            .once("connection_ack", ({ token }) => {
                client1_token = token;
                client1.emit("start_game");
            })
            .connect();
    });

    test("player can quit before the game start and another player take his place", done => {
        const client1 = socs.openClientSocket("p1");
        const client2 = socs.openClientSocket("p2");
        const client3 = socs.openClientSocket("p3");

        client1.once("choose_role", () => {
            client2.once("choose_role", () => {
                client2.emit("iwannabetracer", "second");
                client1.disconnect();

                client3.once("choose_role", () => {
                    client3.emit("iwannabetracer", "first");

                    const p3_done = new Promise(resolve => {
                        client3.once("game_started", data => {
                            expect(data.role).toBe("first");
                            socListen(
                                client3,
                                "update",
                                d => d.turn === "player1"
                            ).then(resolve);
                        });
                    });
                    const p2_done = new Promise(resolve => {
                        client2.once("game_started", data => {
                            expect(data.role).toBe("second");
                            resolve();
                        });
                    });

                    Promise.all([p3_done, p2_done]).then(() => {
                        const client1_again = socs.openClientSocket("p1");
                        client1_again.once("choose_role", () => done());
                        client1_again.once("connection_ack", () => {
                            client1_again.emit("start_game");
                        });

                        client1_again.connect();
                    });
                });
                client3.once("connection_ack", () => {
                    client3.emit("start_game");
                });
                client3.connect();
            });
            client2.once("connection_ack", () => {
                client2.emit("start_game");
            });
            client2.connect();
        });

        client1.once("connection_ack", () => {
            client1.emit("start_game");
        });
        client1.connect();
    });

    test("player can disconnect before match started and on reconnection his setup is reset", done => {
        const client1 = socs.openClientSocket("p1");
        const client2 = socs.openClientSocket("p2");
        const client1_again = socs.openClientSocket("p1");

        client1.once("choose_role", () => {
            client1.emit("iwannabetracer", "first");
            client2.once("choose_role", () => {
                (client1 as typeof Socket).once("disconnect", () => {
                    client2.emit("iwannabetracer", "second");
                    client1_again.once("choose_role", () => done());
                    client1_again.once("connection_ack", () => {
                        client1_again.emit("start_game");
                    });
                    client1_again.connect();
                });
                client1.disconnect();
            });
            client2.once("connection_ack", () => {
                client2.emit("start_game");
            });
            client2.connect();
        });

        client1.once("connection_ack", () => {
            client1.emit("start_game");
        });
        client1.connect();
    });
});
