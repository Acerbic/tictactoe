import { decode } from "jsonwebtoken";

import { JWTSession } from "@trulyacerbic/ttt-apis/ghost-api";
import {
    CheckGameResponse,
    MakeMoveResponse
} from "@trulyacerbic/ttt-apis/gmaster-api";
import { TestServer } from "./__TestServer";

describe("test players' ability to change name", () => {
    let s: TestServer;

    beforeEach(() => {
        s = new TestServer();
    });

    afterEach(async () => {
        return s && s.destroy();
    });

    test("without reconnecting", async () => {
        let client1 = s.openClientSocket("p1");

        const { token } = await client1.listenAfter(
            () => client1.connect(),
            "connection_ack"
        );
        expect((decode(token) as JWTSession).playerName).toEqual("p1");

        const { token: newtoken } = await client1.listenAfter(
            () => client1.emit("renamed", "NewName"),
            "rename_ack"
        );
        expect((decode(newtoken) as JWTSession).playerName).toEqual("NewName");
    });

    test("before game starts and the opponent will see the new name", async () => {
        let c1 = s.openClientSocket("p1");
        let c2 = s.openClientSocket("p2");

        await c2.listenAfter(() => c2.connect(), "connection_ack");
        await c2.listenAfter(() => c2.emit("start_game"), "choose_role");

        await c1.listenAfter(() => c1.connect(), "connection_ack");
        await c1.listenAfter(() => c1.emit("renamed", "NewName"), "rename_ack");
        await c1.listenAfter(() => c1.emit("start_game"), "choose_role");
        c1.emit("iwannabetracer", "second");

        const updatePromise = c2.listen(
            "update",
            ({ turn }) => turn === "player1"
        );
        const data = await c2.listenAfter(
            () => c2.emit("iwannabetracer", "first"),
            "game_started"
        );
        const { meta, player2, turn } = await updatePromise;

        expect(data.role).toBe("first");
        expect(data.opponentName).toBe("NewName");
        expect(turn).toBe("player1");
        expect(meta.playerNames[player2]).toBe("NewName");
    });

    test("in mid game, the game updates don't keep old name", async () => {
        let c1 = s.openClientSocket("p1");
        let c2 = s.openClientSocket("p2");

        await c1.listenAfter(() => c1.connect(), "connection_ack");
        await c1.listenAfter(() => c1.emit("start_game"), "choose_role");
        const p1_ready = c1.listenAfter(
            () => c1.emit("iwannabetracer", "first"),
            "game_started"
        );

        await c2.listenAfter(() => c2.connect(), "connection_ack");
        await c2.listenAfter(() => c2.emit("start_game"), "choose_role");
        const p2_ready = c2.listenAfter(
            () => c2.emit("iwannabetracer", "second"),
            "game_started"
        );

        // wait for setup to finish
        await Promise.all([p1_ready, p2_ready]);

        // p1 makes move and waits until it takes
        await c1.listenAfter(
            () => c1.emit("move", { row: 0, column: 0 }),
            "update",
            ({ board }) => board[0][0] !== null
        );

        await c1.listenAfter(() => c1.emit("renamed", "NewName"), "rename_ack");

        // p2 makes move and waits until it takes
        const { meta, player1 } = await c2.listenAfter(
            () => c2.emit("move", { row: 0, column: 1 }),
            "update",
            ({ board }) => board[0][1] !== null
        );

        expect(meta.playerNames[player1]).toBe("p1");
    });

    test("name changed mid game, it is visible in the next", async () => {
        let c1 = s.openClientSocket("p1");
        let c2 = s.openClientSocket("p2");

        await c1.listenAfter(() => c1.connect(), "connection_ack");
        await c1.listenAfter(() => c1.emit("start_game"), "choose_role");
        const p1_ready = c1.listenAfter(
            () => c1.emit("iwannabetracer", "first"),
            "game_started"
        );

        await c2.listenAfter(() => c2.connect(), "connection_ack");
        await c2.listenAfter(() => c2.emit("start_game"), "choose_role");
        const p2_ready = c2.listenAfter(
            () => c2.emit("iwannabetracer", "second"),
            "game_started"
        );

        // wait for setup to finish
        await Promise.all([p1_ready, p2_ready]);

        // p1 makes move and waits until it takes
        const state = await c1.listenAfter(
            () => c1.emit("move", { row: 0, column: 0 }),
            "update",
            ({ board }) => board[0][0] !== null
        );

        await c1.listenAfter(() => c1.emit("renamed", "NewName"), "rename_ack");

        // fake game conclusion
        s.mocked_gmc.post.mockResolvedValue(<MakeMoveResponse>{
            success: true,
            newState: {
                ...state,
                game: "draw",
                turn: "player1"
            }
        });
        s.mocked_gmc.get.mockResolvedValue(<CheckGameResponse>{
            state: {
                ...state,
                game: "draw",
                turn: "player1"
            }
        });

        // p2 makes move and waits until it takes
        // This should end the game in the ghost server
        await c2.listenAfter(
            () => c2.emit("move", { row: 0, column: 1 }),
            "update",
            ({ game }) => game === "draw"
        );

        await new Promise(rs => setTimeout(rs, 10));

        // starting a second game
        await c1.listenAfter(() => c1.emit("start_game"), "choose_role");
        const p1_ready_2 = c1.listenAfter(
            () => c1.emit("iwannabetracer", "first"),
            "game_started"
        );

        await c2.listenAfter(() => c2.emit("start_game"), "choose_role");
        const p2_ready_2 = c2.listenAfter(
            () => c2.emit("iwannabetracer", "second"),
            "game_started"
        );

        const [_, p2_second_game] = await Promise.all([p1_ready_2, p2_ready_2]);

        expect(p2_second_game.opponentName).toBe("NewName");
    });
});
