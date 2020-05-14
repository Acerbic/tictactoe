/**
 * Testing REST API
 */

import supertest from "supertest";
import app from "../src/app";

import * as api from "../src/routes/api";

// TODO: test gmaster responses when it is ran without PRISMA_URL var.
// TODO: test gmaster responses when PRISMA_URL is set, but prisma unresponsive.

/**
 * If provided string endpoint (in the form of URI like
 * "http://localhost:3000"), use it. Otherwise, instantiate a new web
 * application from source code (in this case, don't forget to set up PRISMA_URL
 * env variable to point to prisma storage)
 */
const agent_app =
    "string" === typeof process.env.ENDPOINT && process.env.ENDPOINT.length > 0
        ? process.env.ENDPOINT
        : app;
const agent: ReturnType<typeof supertest.agent> = supertest
    .agent(agent_app)
    .type("json") as any; // :( bad type definitions in @types/supertest

describe("REST apis", () => {
    it("can create a new game", async () => {
        const res: api.CreateGameResponse = (await agent
            .post("/CreateGame")
            .send(<api.CreateGameRequest>{
                player1Id: "p1",
                player2Id: "p2"
            })
            .expect(200)).body;

        expect(res.success).toBeTruthy();
        expect(res.newState).toEqual(<api.GameState>{
            turn: "player1",
            game: "wait"
        });
        expect(typeof res.gameId).toBe("string");
        expect(res.gameId.length).toBeGreaterThan(1);
    });

    it("can drop an existing game", async () => {
        const res_c: api.CreateGameResponse = (await agent
            .post("/CreateGame")
            .send(<api.CreateGameRequest>{
                player1Id: "p1",
                player2Id: "p2"
            })).body;

        const res_d: api.DropGameResponse = (await agent
            .post(`/DropGame/${res_c.gameId}`)
            .send(<api.DropGameRequest>{})
            .expect(200)).body;

        expect(res_d.success).toBeTruthy();
    });

    it("can check state of an existing game", async () => {
        const res_c: api.CreateGameResponse = (await agent
            .post("/CreateGame")
            .send(<api.CreateGameRequest>{
                player1Id: "p1",
                player2Id: "p2"
            })).body;

        const res: api.CheckGameResponse = (await agent
            .get(`/CheckGame/${res_c.gameId}`)
            .expect(200)).body;

        expect(res.success).toBeTruthy();
        expect(res.state).toEqual(<api.GameState>{
            turn: "player1",
            game: "wait"
        });
    });

    it("can make a game move", async () => {
        const res_c: api.CreateGameResponse = (await agent
            .post("/CreateGame")
            .send(<api.CreateGameRequest>{
                player1Id: "p1",
                player2Id: "p2"
            })).body;

        const res: api.MakeMoveResponse = (await agent
            .post(`/MakeMove/${res_c.gameId}`)
            .send(<api.MakeMoveRequest>{
                playerId: "p1",
                move: { row: 1, column: 1 }
            })
            .expect(200)).body;

        expect(res.success).toBeTruthy();
        expect(res.newState).toEqual(<api.GameState>{
            turn: "player2",
            game: "wait"
        });
    });
});
