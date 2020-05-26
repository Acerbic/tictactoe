/**
 * Testing various modes of failure
 *
 * Must provide with env variable `ENDPOINT` to test a remote host running
 * gmaster, or variable `HASURA_URL` to instantiate the application from source
 * code.
 */
import supertest from "supertest";
import generateApp from "../src/app";

import * as api from "@trulyacerbic/ttt-apis/gmaster-api";

it("should fail to start the server if HASURA_URL unset", () => {
    const oldHASURA_URL = process.env.HASURA_URL;
    delete process.env.HASURA_URL;
    expect(generateApp).toThrow();
    process.env.HASURA_URL = "malformedurl";
    expect(generateApp).toThrow();
    process.env.HASURA_URL = oldHASURA_URL;
});

// TODO: fix to point to hasura
it("should error if db storage is unavailable", async () => {
    const oldHASURA_URL = process.env.HASURA_URL;
    process.env.HASURA_URL = "http://localhost:59999"; // fakeout
    const misdirectedApp = generateApp();
    process.env.HASURA_URL = oldHASURA_URL;
    const res: api.APIResponseFailure = (
        await supertest(misdirectedApp)
            .post("/CreateGame")
            .type("json")
            .send(<api.CreateGameRequest>{
                player1Id: "p1",
                player2Id: "p2"
            })
            .expect(200)
    ).body;

    expect(res.success).toBe(false);
});

describe("Logical errors", () => {
    let agent: ReturnType<typeof supertest.agent>;

    beforeAll(() => {
        /**
         * If provided string endpoint (in the form of URI like
         * "http://localhost:3000"), use it. Otherwise, instantiate a new web
         * application from source code (in this case, don't forget to set up HASURA_URL
         * env variable to point to hasura storage)
         */
        const agent_app =
            "string" === typeof process.env.ENDPOINT &&
            process.env.ENDPOINT.length > 0
                ? process.env.ENDPOINT
                : generateApp();
        agent = supertest.agent(agent_app).type("json") as any; // :( bad type definitions in @types/supertest
    });

    it("should prevent creating a game with two identical players", async () => {
        const pId = "someId";

        const res: api.APIResponseFailure = (
            await agent
                .post("/CreateGame")
                .send(<api.CreateGameRequest>{ player1Id: pId, player2Id: pId })
                .expect(200)
        ).body;

        expect(res.success).toBe(false);
    });

    it("should require both players ids to be non-empty strings", async () => {
        const res: api.APIResponseFailure = (
            await agent
                .post("/CreateGame")
                .send(<api.CreateGameRequest>{ player2Id: "p2" })
                .expect(200)
        ).body;

        expect(res.success).toBe(false);

        const res2: api.APIResponseFailure = (
            await agent
                .post("/CreateGame")
                .send(<api.CreateGameRequest>{ player1Id: "p1", player2Id: "" })
                .expect(200)
        ).body;

        expect(res2.success).toBe(false);
    });

    it.todo("should fail attempt at droping non-existant game");

    describe(".. during a match", () => {
        const player1Id = "p1";
        const player2Id = "p2";

        let gameId: api.GameId;
        let currentPlayer: api.GameState["turn"];

        beforeEach(async () => {
            const res: api.CreateGameResponse = (
                await agent
                    .post("/CreateGame")
                    .send(<api.CreateGameRequest>{
                        player1Id: player1Id,
                        player2Id: player2Id
                    })
                    .expect(200)
            ).body;
            gameId = res.gameId;
            currentPlayer = res.newState.turn;
        });

        afterEach(async () => {
            if (typeof gameId === "string" && gameId.length > 0) {
                await agent.post("/DropGame/" + gameId);
            }
        });

        it("should decline the same player making two sequencial moves", async () => {
            expect(currentPlayer).toBe("player1");
            const m1_res: api.MakeMoveResponse = (
                await agent
                    .post("/MakeMove/" + gameId)
                    .send(<api.MakeMoveRequest>{
                        move: { row: 1, column: 1 },
                        playerId: player1Id
                    })
                    .expect(200)
            ).body;

            expect(m1_res.success).toBe(true);
            expect(m1_res.newState.turn).toBe("player2");

            const m2_res: api.APIResponseFailure = (
                await agent
                    .post("/MakeMove/" + gameId)
                    .send(<api.MakeMoveRequest>{
                        move: { row: 1, column: 2 },
                        playerId: player1Id
                    })
                    .expect(200)
            ).body;

            expect(m2_res.success).toBe(false);
        });

        it("should not allow to make a move into an occupied cell", async () => {
            expect(currentPlayer).toBe("player1");
            const m1_res: api.MakeMoveResponse = (
                await agent
                    .post("/MakeMove/" + gameId)
                    .send(<api.MakeMoveRequest>{
                        move: { row: 1, column: 1 },
                        playerId: player1Id
                    })
                    .expect(200)
            ).body;

            expect(m1_res.success).toBe(true);
            expect(m1_res.newState.turn).toBe("player2");

            const m2_res: api.APIResponseFailure = (
                await agent
                    .post("/MakeMove/" + gameId)
                    .send(<api.MakeMoveRequest>{
                        move: { row: 1, column: 1 },
                        playerId: player2Id
                    })
                    .expect(200)
            ).body;

            expect(m2_res.success).toBe(false);
        });

        it("should reject move from an unknown player id", async () => {
            const res: api.MakeMoveResponse = (
                await agent
                    .post("/MakeMove/" + gameId)
                    .send(<api.MakeMoveRequest>{
                        move: { row: 1, column: 1 },
                        playerId: player1Id + "123123"
                    })
                    .expect(200)
            ).body;

            expect(res.success).toBe(false);
        });

        it("should not allow a move into a cell out of bounds", async () => {
            expect(currentPlayer).toBe("player1");
            const m1_res: api.MakeMoveResponse = (
                await agent
                    .post("/MakeMove/" + gameId)
                    .send(<api.MakeMoveRequest>{
                        move: { row: -1, column: 1 },
                        playerId: player1Id
                    })
                    .expect(200)
            ).body;

            expect(m1_res.success).toBe(false);

            const m2_res: api.MakeMoveResponse = (
                await agent
                    .post("/MakeMove/" + gameId)
                    .send(<api.MakeMoveRequest>{
                        move: { row: 6, column: 1 },
                        playerId: player1Id
                    })
                    .expect(200)
            ).body;

            expect(m2_res.success).toBe(false);
        });

        it("should reject a move to a game that is already finished", async () => {
            // p1 and p2 are making moves
            await agent
                .post("/MakeMove/" + gameId)
                .send(<api.MakeMoveRequest>{
                    playerId: player1Id,
                    move: { row: 0, column: 0 }
                })
                .expect(200);

            await agent
                .post("/MakeMove/" + gameId)
                .send(<api.MakeMoveRequest>{
                    playerId: player2Id,
                    move: { row: 1, column: 0 }
                })
                .expect(200);

            await agent
                .post("/MakeMove/" + gameId)
                .send(<api.MakeMoveRequest>{
                    playerId: player1Id,
                    move: { row: 0, column: 1 }
                })
                .expect(200);

            await agent
                .post("/MakeMove/" + gameId)
                .send(<api.MakeMoveRequest>{
                    playerId: player2Id,
                    move: { row: 1, column: 1 }
                })
                .expect(200);

            const res_mov: api.MakeMoveResponse = (
                await agent
                    .post("/MakeMove/" + gameId)
                    .send(<api.MakeMoveRequest>{
                        playerId: player1Id,
                        move: { row: 0, column: 2 }
                    })
                    .expect(200)
            ).body;

            // make sure last move brings victory
            expect(res_mov.success).toBe(true);
            expect(res_mov.newState.game).toBe("over");
            expect(res_mov.newState.turn).toBe("player2");

            const res_mov2: api.APIResponseFailure = (
                await agent
                    .post("/MakeMove/" + gameId)
                    .send(<api.MakeMoveRequest>{
                        playerId: player1Id,
                        move: { row: 2, column: 2 }
                    })
                    .expect(200)
            ).body;

            expect(res_mov2.success).toBe(false);
        });
    });
});
