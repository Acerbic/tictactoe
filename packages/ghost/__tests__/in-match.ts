/**
 * Simulation of incoming connections and setup of a new game.
 */

// allow step debugging
const EXTEND_SOCKET_TIMEOUTS = process.env.VSCODE_CLI ? true : false;

import { Socket } from "socket.io-client";
import http from "http";
import ioServer from "socket.io";
import { AddressInfo } from "net";

/**
 * Mockarena!
 */
import GmasterConnector from "../src/connectors/gmaster_connector";
jest.mock("../src/connectors/gmaster_connector");
import * as gm_api from "@trulyacerbic/ttt-apis/gmaster-api";
import { API as gh_api, JWTSession } from "@trulyacerbic/ttt-apis/ghost-api";

import { debuglog } from "../src/utils";

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
import { GhostInSocket, socListen } from "./__utils";
import ClientSockets from "./__ClientSockets";
import { decode } from "jsonwebtoken";

describe("After game started", () => {
    let httpServer: http.Server;
    let httpServerAddr: AddressInfo;
    let socServer: ioServer.Server;
    let client1: GhostInSocket;
    let client2: GhostInSocket;
    let client1_token: string;
    let client2_token: string;
    let player1Id: gm_api.PlayerId;
    let player2Id: gm_api.PlayerId;

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
        debuglog("Server addr is ", httpServerAddr);
        socServer = ioServer(httpServer, {
            pingTimeout: EXTEND_SOCKET_TIMEOUTS ? 1000000 : 5000
        });
        new SocketDispatcher().attach(socServer);

        socs = new ClientSockets(
            // Travis CI ?
            process.env.TRAVIS
                ? `http://0.0.0.0:${httpServerAddr.port}`
                : `http://[${httpServerAddr.address}]:${httpServerAddr.port}`
        );

        // mock implementations to prepare for a game
        const gameState: gm_api.GameState = {
            id: "1111111",
            player1: "???? p1",
            player2: "???? p2",
            board: [
                [null, null, null],
                [null, null, null],
                [null, null, null]
            ],
            meta: null,
            game: "wait",
            turn: "player1"
        };
        mocked_gmc_post.mockImplementation((endpoint, payload) => {
            switch (endpoint) {
                case "CreateGame":
                    gameState.player1 = (payload as gm_api.CreateGameRequest).player1Id;
                    gameState.player2 = (payload as gm_api.CreateGameRequest).player2Id;
                    return Promise.resolve(<gm_api.CreateGameResponse>{
                        success: true,
                        gameId: "1111111",
                        newState: gameState
                    });
                case "MakeMove":
                    const moveReq = payload as gm_api.MakeMoveRequest;

                    gameState.turn =
                        gameState.turn === "player1" ? "player2" : "player1";

                    gameState.board[moveReq.move.row][moveReq.move.column] =
                        moveReq.playerId;
                    return Promise.resolve(<gm_api.MakeMoveResponse>{
                        success: true,
                        newState: gameState
                    });
                case "DropGame":
                    return Promise.resolve(<gm_api.DropGameResponse>{
                        success: true
                    });

                default:
                    return Promise.reject({
                        success: false,
                        errorMessage: "Bad Endpoint: " + endpoint,
                        errorCode: 0
                    });
            }
        });
        mocked_gmc_get.mockImplementation(() => {
            return Promise.resolve(<gm_api.CheckGameResponse>{
                success: true,
                state: gameState
            });
        });

        const p1_done = new Promise(resolve => {
            client1 = socs!.openClientSocket("p1");
            client1
                .once("connection_ack", ({ token }) => {
                    client1_token = token;
                    client1.emit("start_game");
                })
                .once("choose_role", () => {
                    client1.emit("iwannabetracer", "first");
                })
                .once("game_started", data => {
                    expect(data.role).toBe("first");
                    client1.on(
                        "update",
                        ({ turn }) => turn === "player1" && resolve()
                    );
                });
            client1.connect();
        });
        const p2_done = new Promise(resolve => {
            client2 = socs!.openClientSocket("p2");
            client2
                .once("connection_ack", ({ token }) => {
                    client2_token = token;
                    client2.emit("start_game");
                })
                .once("choose_role", () => {
                    client2.emit("iwannabetracer", "second");
                })
                .once("game_started", data => {
                    expect(data.role).toBe("second");
                    resolve();
                });
            client2.connect();
        });

        Promise.all([p1_done, p2_done]).then(() => {
            player1Id = (decode(client1_token) as JWTSession).playerId;
            player2Id = (decode(client2_token) as JWTSession).playerId;
            gameState.player1 = player1Id;
            gameState.player2 = player2Id;

            done();
        });
    });

    /**
     *  Cleanup WS & HTTP servers
     */
    afterEach(done => {
        socs!.cleanUp();
        socServer.close();
        httpServer.close();
        mocked_gmc_post.mockReset();
        mocked_gmc_get.mockReset();

        done();
    });

    test("can pass turns between players", done => {
        mocked_gmc_get.mockResolvedValueOnce(<gm_api.CheckGameResponse>{
            success: true,
            state: {
                board: [
                    [player1Id, null, null],
                    [null, null, null],
                    [null, null, null]
                ],
                game: "wait",
                turn: "player2",
                player1: player1Id,
                player2: player2Id
            }
        });

        const p1_done = new Promise(resolve =>
            client1
                .once("update", data => {
                    expect(data.game).toBe("wait");
                    expect(data.turn).toBe("player2");
                    expect(data.board[0][0]).toBe(player1Id);
                    resolve();
                })
                .emit("move", { row: 0, column: 0 })
        );

        const p2_done = new Promise(resolve =>
            client2.once("update", data => {
                expect(data.turn).toBe("player2");
                expect(data.game).toBe("wait");
                expect(data.board[0][0]).toBe(player1Id);
                resolve();
            })
        );

        Promise.all([p1_done, p2_done]).then(() => done());
    });

    test("can reconnect (immediately after start)", done => {
        (client1 as typeof Socket).once("disconnect", () => {
            client1 = socs!.openClientSocket("p1", client1_token);
            client1.once("update", data => {
                expect(data.turn).toBe("player1");
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

    test("can win the game as the first player", done => {
        const c1 = client1,
            c2 = client2;
        (async () => {
            let u: gh_api["out"]["update"];
            const is_p1_turn = (d: gh_api["out"]["update"]) =>
                d.turn === "player1";
            const is_p2_turn = (d: gh_api["out"]["update"]) =>
                d.turn === "player2";

            // emit p1 move and wait for the first "update" coming back
            c1.emit("move", { row: 0, column: 0 });
            u = await socListen(c1, "update");
            expect(u.turn).toBe("player2");

            // emit p2 move and wait until turn is back in p1's corner
            c2.emit("move", { row: 1, column: 0 });
            u = await socListen(c1, "update", is_p1_turn);
            expect(u.board[0][0]).toBe(player1Id);
            expect(u.board[1][0]).toBe(player2Id);
            c1.emit("move", { row: 0, column: 1 });

            await socListen(c2, "update", is_p2_turn);
            c2.emit("move", { row: 1, column: 1 });

            await socListen(c1, "update", is_p1_turn);

            mocked_gmc_post.mockResolvedValueOnce(<gm_api.MakeMoveResponse>{
                success: true,
                newState: {
                    id: "1111111",
                    player1: u.player1,
                    player2: u.player2,
                    board: u.board,
                    meta: null,
                    game: "over",
                    turn: "player2"
                }
            });
            c1.emit("move", { row: 0, column: 2 });

            const go = await socListen(c1, "gameover");
            expect(go.winner).toBe(player1Id);
        })().then(done);
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
                .on("update", data => {
                    if (data.turn === "player1") {
                        if (p1_moves.length <= 1) {
                            mocked_gmc_post.mockResolvedValueOnce(<
                                gm_api.MakeMoveResponse
                            >{
                                success: true,
                                newState: { game: "draw", turn: "player2" }
                            });
                        }

                        client1.emit("move", p1_moves.shift()!);
                    }
                })
                .once("gameover", ({ winner }) => {
                    expect(winner).toBe(null);
                    resolve();
                })
                .emit("move", p1_moves.shift()!);
        });

        const p2_done = new Promise(resolve => {
            const p2_moves = [
                { row: 1, column: 0 },
                { row: 1, column: 1 },
                { row: 0, column: 2 },
                { row: 2, column: 1 }
            ];
            client2
                .on("update", data => {
                    if (data.turn === "player2") {
                        client2.emit("move", p2_moves.shift()!);
                    }
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
        client1.emit("move", client1_moves.shift()).on("update", ({ turn }) => {
            if (turn === "player1") {
                if (client1_moves.length > 0) {
                    client1.emit("move", client1_moves.shift());
                } else {
                    client1.disconnect();
                }
            }
        });

        (client1 as typeof Socket).once("disconnect", () => {
            mocked_gmc_get.mockResolvedValueOnce(<gm_api.CheckGameResponse>{
                success: true,
                state: {
                    board: [
                        [player1Id, player1Id, player2Id],
                        [player2Id, player2Id, player1Id],
                        [null, null, null]
                    ],
                    game: "wait",
                    turn: "player1",
                    player1: player1Id,
                    player2: player2Id
                }
            });
            const client1_again = socs!.openClientSocket("p1", client1_token);
            client1_again.on("update", data => {
                expect(data.turn).toBe("player1");
                expect(data.board).toEqual([
                    [player1Id, player1Id, player2Id],
                    [player2Id, player2Id, player1Id],
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
        client2.on("update", ({ turn }) => {
            if (turn === "player2" && client2_moves.length > 0) {
                client2.emit("move", client2_moves.shift());
            }
        });
    });
});
