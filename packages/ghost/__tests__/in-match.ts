/**
 * Simulation of incoming connections and setup of a new game.
 */

// allow step debugging
const EXTEND_SOCKET_TIMEOUTS = process.env.VSCODE_CLI ? true : false;

import ioClient from "socket.io-client";
import http from "http";
import ioServer from "socket.io";
import { AddressInfo } from "net";

/**
 * Mockarena!
 */
import GmasterConnector from "../src/connectors/gmaster_connector";
import {
    getGameBoard,
    PrismaGetGameBoard
} from "../src/connectors/prisma_connector";
import * as gm_api from "@trulyacerbic/ttt-apis/gmaster-api";
import { API as gh_api } from "@trulyacerbic/ttt-apis/ghost-api";
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
import { GhostInSocket } from "./__utils";

describe("After game started", () => {
    let httpServer: http.Server;
    let httpServerAddr: AddressInfo;
    let socServer: ioServer.Server;
    let client1: GhostInSocket;
    let client2: GhostInSocket;

    // keeps track of opened sockets to close them between tests
    let socketsOpened: Array<SocketIOClient.Socket>;

    // helper to open a socket communication from emulated client.
    function openClientSocket(playerId: string): GhostInSocket {
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
        return socket as GhostInSocket;
    }

    /**
     * Setup WS & HTTP servers
     */
    beforeEach(done => {
        /* remocking implementations that were reset between tests */
        mocked_gmc_post.mockImplementation(endpoint =>
            Promise.resolve(<gm_api.APIResponseFailure>{
                success: false,
                errorCode: 0,
                errorMessage: "Mocked POST response for " + endpoint
            })
        );
        mocked_gmc_get.mockImplementation(endpoint =>
            Promise.resolve(<gm_api.APIResponseFailure>{
                success: false,
                errorCode: 0,
                errorMessage: "Mocked GET response for " + endpoint
            })
        );

        (getGameBoard as jest.MockedFunction<
            PrismaGetGameBoard
        >).mockImplementation(() =>
            Promise.resolve([
                [null, null, null],
                [null, null, null],
                [null, null, null]
            ])
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

        // note: (not in official documentation tho, may change)
        // (ioServer as any).httpServer === httpServer;

        socketsOpened = [];

        // mock implementations to prepare for a game
        let next_turn = "player1";
        mocked_gmc_post.mockImplementation((endpoint, payload) => {
            switch (endpoint) {
                case "CreateGame":
                    return Promise.resolve(<gm_api.CreateGameResponse>{
                        success: true,
                        gameId: "1111111",
                        newState: { game: "wait", turn: "player1" }
                    });
                case "MakeMove":
                    const expected_player_id =
                        next_turn === "player1" ? "p1" : "p2";
                    // debuglog(
                    //     "expected player: %s, payload: %s, move: ",
                    //     expected_player_id,
                    //     (payload as gm_api.MakeMoveRequest).playerId,
                    //     (payload as gm_api.MakeMoveRequest).move
                    // );
                    if (
                        (payload as gm_api.MakeMoveRequest).playerId !==
                        expected_player_id
                    ) {
                        // debuglog("!!!! attention! bad move !!!!");
                        return Promise.resolve(<gm_api.APIResponseFailure>{
                            success: false,
                            errorCode: 0,
                            errorMessage: "Wrong player turn"
                        });
                    }
                    next_turn = next_turn === "player1" ? "player2" : "player1";
                    return Promise.resolve(<gm_api.MakeMoveResponse>{
                        success: true,
                        newState: { game: "wait", turn: next_turn }
                    });
                default:
                    return Promise.resolve({
                        success: false,
                        errorMessage: "Bad Endpoint: " + endpoint,
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
                .once("you_are_it", data => {
                    expect(data.role).toBe("first");
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
                .once("you_are_it", data => {
                    expect(data.role).toBe("second");
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
        mocked_gmc_post.mockReset();
        mocked_gmc_get.mockReset();
        (getGameBoard as jest.Mock).mockReset();

        done();
    });

    test("can reconnect (immediately after start)", done => {
        client1.once("disconnect", () => {
            client1 = openClientSocket("p1");
            client1.once("update", data => {
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
    });

    test("can win the game as first player", done => {
        const p1_done = new Promise(resolve => {
            const p1_moves = [
                { row: 0, column: 0 },
                { row: 0, column: 1 },
                { row: 0, column: 2 }
            ];
            client1
                .once("gameover", ({ winner }) => {
                    expect(winner).toBe("p1");
                    resolve();
                })
                .on("your_turn", () => {
                    if (p1_moves.length <= 1) {
                        mocked_gmc_post.mockResolvedValueOnce(<
                            gm_api.MakeMoveResponse
                        >{
                            success: true,
                            newState: { game: "over", turn: "player2" }
                        });
                    }
                    client1.emit("move", p1_moves.shift());
                })
                .emit("move", p1_moves.shift());
        });

        const p2_done = new Promise(resolve => {
            const p2_moves = [
                { row: 1, column: 0 },
                { row: 1, column: 1 }
            ];
            client2
                .on("your_turn", () => {
                    client2.emit("move", p2_moves.shift());
                })
                .once("gameover", ({ winner }) => {
                    expect(winner).toBe("p1");
                    resolve();
                });
        });

        Promise.all([p1_done, p2_done]).then(() => done());
    });

    test("can win the game as second player", done => {
        const p1_done = new Promise(resolve => {
            const p1_moves = [
                { row: 0, column: 0 },
                { row: 0, column: 1 },
                { row: 2, column: 2 }
            ];
            client1
                .on("your_turn", () => client1.emit("move", p1_moves.shift()))
                .once("gameover", ({ winner }) => {
                    expect(winner).toBe("p2");
                    resolve();
                })
                .emit("move", p1_moves.shift());
        });

        const p2_done = new Promise(resolve => {
            const p2_moves = [
                { row: 1, column: 0 },
                { row: 1, column: 1 },
                { row: 1, column: 2 }
            ];
            client2
                .on("your_turn", () => {
                    if (p2_moves.length <= 1) {
                        mocked_gmc_post.mockResolvedValueOnce(<
                            gm_api.MakeMoveResponse
                        >{
                            success: true,
                            newState: { game: "over", turn: "player1" }
                        });
                    }

                    client2.emit("move", p2_moves.shift());
                })
                .once("gameover", ({ winner }) => {
                    expect(winner).toBe("p2");
                    resolve();
                });
        });

        Promise.all([p1_done, p2_done]).then(() => done());
    });

    test("can draw the game", done => {
        const p1_done = new Promise(resolve => {
            const p1_moves = [
                { row: 0, column: 0 },
                { row: 0, column: 1 },
                { row: 1, column: 2 },
                { row: 2, column: 0 },
                { row: 2, column: 2 }
            ];
            client1
                .on("your_turn", () => {
                    if (p1_moves.length <= 1) {
                        mocked_gmc_post.mockResolvedValueOnce(<
                            gm_api.MakeMoveResponse
                        >{
                            success: true,
                            newState: { game: "draw", turn: "player2" }
                        });
                    }

                    client1.emit("move", p1_moves.shift());
                })
                .once("gameover", ({ winner }) => {
                    expect(winner).toBe(null);
                    resolve();
                })
                .emit("move", p1_moves.shift());
        });

        const p2_done = new Promise(resolve => {
            const p2_moves = [
                { row: 1, column: 0 },
                { row: 1, column: 1 },
                { row: 0, column: 2 },
                { row: 2, column: 1 }
            ];
            client2
                .on("your_turn", () => {
                    client2.emit("move", p2_moves.shift());
                })
                .once("gameover", ({ winner }) => {
                    expect(winner).toBe(null);
                    resolve();
                });
        });

        Promise.all([p1_done, p2_done]).then(() => done());
    });

    test("can reconnect in a middle of a match and have board position", done => {
        const client1_moves: gh_api["in"]["move"][] = [
            { row: 0, column: 0 },
            { row: 0, column: 1 },
            { row: 1, column: 2 }
        ];
        client1
            .emit("move", client1_moves.shift())
            .on("your_turn", () => {
                if (client1_moves.length > 0) {
                    client1.emit("move", client1_moves.shift());
                } else {
                    client1.disconnect();
                }
            })
            .once("disconnect", () => {
                (getGameBoard as jest.MockedFunction<PrismaGetGameBoard>)
                    .mockResolvedValueOnce([
                        ["p1", "p1", "p2"],
                        ["p2", "p2", "p1"],
                        [null, null, null]
                    ])
                    .mockName("in-test-name");
                const client1_again = openClientSocket("p1");
                client1_again.on("update", data => {
                    expect(data.step).toBe("my-turn");
                    expect(data.board).toEqual([
                        ["p1", "p1", "p2"],
                        ["p2", "p2", "p1"],
                        [null, null, null]
                    ]);
                    done();
                });
                client1_again.connect();
            });

        const client2_moves: gh_api["in"]["move"][] = [
            { row: 1, column: 0 },
            { row: 1, column: 1 },
            { row: 0, column: 2 }
        ];
        client2.on("your_turn", () => {
            if (client2_moves.length > 0) {
                client1.emit("move", client2_moves.shift());
            }
        });
    });
});
