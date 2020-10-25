/**
 * Simulation of incoming connections and setup of a new game.
 */

// allow step debugging
const EXTEND_TIMEOUTS = process.env.VSCODE_CLI ? true : false;

import { Socket } from "socket.io-client";
import { decode } from "jsonwebtoken";
import debug from "debug";
const testlog = debug("ttt:test");

/**
 * Mockarena!
 */
import GmasterConnector from "../src/connectors/gmaster_connector";
jest.mock("../src/connectors/gmaster_connector");
import { reconnect_timer } from "./__reconnect_timer";
jest.mock("../src/state-machine/game-room/actors/reconnect_timer", () => {
    return {
        reconnect_timer
    };
});

import * as gm_api from "@trulyacerbic/ttt-apis/gmaster-api";
import { API as gh_api, JWTSession } from "@trulyacerbic/ttt-apis/ghost-api";

import { GhostInSocket, socListen, tickTimers } from "./__utils";
import ClientSockets from "./__ClientSockets";
import { TestServer } from "./__TestServer";

import { DISCONNECT_FORFEIT_TIMEOUT } from "../src/state-machine/game-room/game-room-schema";

describe("After game started", () => {
    let mocked_gmc: {
        post: jest.MockedFunction<GmasterConnector["post"]>;
        get: jest.MockedFunction<GmasterConnector["get"]>;
    };

    let socs: ClientSockets;

    let client1: GhostInSocket;
    let client2: GhostInSocket;
    let client1_token: string;
    let client2_token: string;
    let player1Id: gm_api.PlayerId;
    let player2Id: gm_api.PlayerId;

    let ts: TestServer | null;

    /**
     * Setup WS & HTTP servers
     */
    beforeEach(done => {
        //  First, we create a running server and mock gmaster connection
        ts = new TestServer();
        socs = ts.socs;
        mocked_gmc = ts.mocked_gmc;

        // Now we simulate players' sessions up to actual game start
        const p1_done = new Promise(async (resolve, reject) => {
            if (!socs) {
                reject(
                    "Sockets should be initialized before game session initialization"
                );
            }
            client1 = socs.openClientSocket("p1");
            client1.connect();

            const { token } = await socListen(client1, "connection_ack");
            client1_token = token;
            client1.emit("start_game");

            await socListen(client1, "choose_role");
            client1.emit("iwannabetracer", "first");

            // update is sent immediately (in the same packet) after
            // game_started, so we need to set up listener beforehand or we lose
            // the message
            const updatePromise = socListen(client1, "update");
            const data = await socListen(client1, "game_started");
            expect(data.role).toBe("first");

            const { turn } = await updatePromise;
            expect(turn).toBe("player1");
            resolve();
        });
        const p2_done = new Promise(async (resolve, reject) => {
            if (!socs) {
                reject(
                    "Sockets should be initialized before game session initialization"
                );
            }
            client2 = socs.openClientSocket("p2");
            client2.connect();

            const { token } = await socListen(client2, "connection_ack");
            client2_token = token;
            client2.emit("start_game");

            await socListen(client2, "choose_role");
            client2.emit("iwannabetracer", "second");

            const { role } = await socListen(client2, "game_started");
            expect(role).toBe("second");
            resolve();
        });

        Promise.all([p1_done, p2_done]).then(() => {
            player1Id = (decode(client1_token) as JWTSession).playerId;
            player2Id = (decode(client2_token) as JWTSession).playerId;

            done();
        });
    });

    /**
     *  Cleanup WS & HTTP servers
     */
    afterEach(async () => {
        return ts && ts.destroy();
    });

    test("can pass turns between players", async () => {
        expect(player1Id).toBeTruthy();

        const p1_done = new Promise(async resolve => {
            client1.emit("move", { row: 0, column: 0 });
            const data = await socListen(client1, "update");
            expect(data.game).toBe("wait");
            expect(data.turn).toBe("player2");
            expect(data.board[0][0]).toBe(player1Id);
            resolve();
        });

        const p2_done = new Promise(async resolve => {
            const data = await socListen(client2, "update");
            expect(data.turn).toBe("player2");
            expect(data.game).toBe("wait");
            expect(data.board[0][0]).toBe(player1Id);
            resolve();
        });

        return Promise.all([p1_done, p2_done]);
    });

    test("can reconnect (immediately after start)", done => {
        expect(player1Id).toBeTruthy();
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

    test("can win the game as the first player", async () => {
        expect(player1Id).toBeTruthy();
        const c1 = client1,
            c2 = client2;
        let u: gh_api["out"]["update"];
        const is_p1_turn = (d: gh_api["out"]["update"]) => d.turn === "player1";
        const is_p2_turn = (d: gh_api["out"]["update"]) => d.turn === "player2";

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

        mocked_gmc.post.mockResolvedValueOnce(<gm_api.MakeMoveResponse>{
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
    });

    test("can draw the game", async () => {
        expect(player1Id).toBeTruthy();
        const p1_done = new Promise(async resolve => {
            const c1 = client1;
            const gameOverPromise = socListen(c1, "gameover");

            c1.emit("move", { row: 0, column: 0 });
            await socListen(c1, "update", ({ turn }) => turn === "player1");

            c1.emit("move", { row: 0, column: 1 });
            await socListen(c1, "update", ({ turn }) => turn === "player1");

            c1.emit("move", { row: 1, column: 2 });
            await socListen(c1, "update", ({ turn }) => turn === "player1");

            c1.emit("move", { row: 2, column: 0 });
            await socListen(c1, "update", ({ turn }) => turn === "player1");

            mocked_gmc.post.mockResolvedValueOnce(<gm_api.MakeMoveResponse>{
                success: true,
                newState: { game: "draw", turn: "player2" }
            });
            c1.emit("move", { row: 2, column: 2 });
            const { winner } = await gameOverPromise;

            expect(winner).toBe(null);
            resolve();
        });

        const p2_done = new Promise(async resolve => {
            const c2 = client2;
            const gameOverPromise = socListen(c2, "gameover");

            await socListen(c2, "update", ({ turn }) => turn === "player2");
            c2.emit("move", { row: 1, column: 0 });

            await socListen(c2, "update", ({ turn }) => turn === "player2");
            c2.emit("move", { row: 1, column: 1 });

            await socListen(c2, "update", ({ turn }) => turn === "player2");
            c2.emit("move", { row: 0, column: 2 });

            await socListen(c2, "update", ({ turn }) => turn === "player2");
            c2.emit("move", { row: 2, column: 1 });

            const { winner } = await gameOverPromise;
            expect(winner).toBe(null);
            resolve();
        });

        return Promise.all([p1_done, p2_done]);
    });

    test("can reconnect in a middle of a match and have board position", done => {
        expect(player1Id).toBeTruthy();
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
            mocked_gmc.get.mockResolvedValueOnce(<gm_api.CheckGameResponse>{
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

    test("auto lose if player doesn't reconnect in a given wait period - p1", async () => {
        const game_result_p = client2.listenAfter(() => {
            client1.disconnect();
        }, "gameover");

        tickTimers(DISCONNECT_FORFEIT_TIMEOUT * 2);
        jest.useRealTimers();
        const game_result = await game_result_p;
        expect(game_result.winner).toBe(player2Id);
    });

    test("auto lose if player doesn't reconnect in a given wait period - p2", async () => {
        await client2.listenAfter(
            () => client1.emit("move", { column: 0, row: 0 }),
            "update"
        );
        const game_result_p = client2.listenAfter(() => {
            client1.disconnect();
        }, "gameover");

        tickTimers(DISCONNECT_FORFEIT_TIMEOUT * 2);
        jest.useRealTimers();
        const game_result = await game_result_p;
        expect(game_result.winner).toBe(player2Id);
    });

    test("can reconnect within grace period", async () => {
        expect(player1Id).toBeTruthy();

        await client1.listenAfter(() => client1.disconnect(), "disconnect");
        tickTimers(DISCONNECT_FORFEIT_TIMEOUT / 2);
        jest.useRealTimers();
        client1 = socs!.openClientSocket("p1", client1_token);
        const data = await client1.listenAfter(
            () => client1.connect(),
            "update"
        );

        expect(data.turn).toBe("player1");
        expect(data.board).toEqual([
            [null, null, null],
            [null, null, null],
            [null, null, null]
        ]);
    });

    test("when both players disconnect for some time, drop game", async () => {
        expect(player1Id).toBeTruthy();

        // First player disconnects
        await client1.listenAfter(() => client1.disconnect(), "disconnect");
        await tickTimers(DISCONNECT_FORFEIT_TIMEOUT * 0.8);
        // Second player disconnects while the first one is still disconnected
        await client2.listenAfter(() => client2.disconnect(), "disconnect");
        await tickTimers(DISCONNECT_FORFEIT_TIMEOUT * 0.5);

        // First player's reconnection window expired, but for p2 isn't yet
        client2 = socs!.openClientSocket("p2", client2_token);
        const data = await client2.listenAfter(() => {
            // 2nd player reconnects to receive gameover update
            client2.connect();
        }, "gameover");

        expect(data.winner).toBe(player2Id);
    });

    test("can quit game", async () => {
        const data = await client2.listenAfter(
            () => client1.emit("im_done"),
            "gameover"
        );
        expect(data.winner).toBe(player2Id);
    });

    test("can start another game after first one ended", async () => {
        await client2.listenAfter(() => client1.emit("im_done"), "gameover");

        await client1.listenAfter(
            () => client1.emit("start_game"),
            "choose_role"
        );
    });

    test("can get gameover update on reconnect, when other player quits", async () => {
        await client1.listenAfter(() => client1.disconnect(), "disconnect");
        await tickTimers(DISCONNECT_FORFEIT_TIMEOUT * 0.5);
        await client2.listenAfter(() => client2.emit("im_done"), "gameover");

        client1 = socs!.openClientSocket("p1", client1_token);
        const data = await client1.listenAfter(() => {
            client1.connect();
        }, "gameover");

        expect(data.winner).toBe(player1Id);
    });
});
