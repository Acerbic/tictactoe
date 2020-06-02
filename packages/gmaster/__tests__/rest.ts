/**
 * Testing REST API
 *
 * See note.md for details on env vars
 */

import supertest from "supertest";
import { generateAppExt } from "./__generateApp.wrap";

import * as api from "@trulyacerbic/ttt-apis/gmaster-api";

const agent: ReturnType<typeof supertest.agent> = supertest
    .agent(generateAppExt())
    .type("json") as any; // :( bad type definitions in @types/supertest

describe("REST apis", () => {
    it("can create a new game", async () => {
        const res: api.CreateGameResponse = (
            await agent
                .post("/CreateGame")
                .send(<api.CreateGameRequest>{
                    player1Id: "p1",
                    player2Id: "p2"
                })
                .expect(200)
        ).body;

        expect(res.success).toBeTruthy();
        const { id, ...withoutID } = res.newState;
        expect(withoutID).toEqual(<api.GameState>{
            player1: "p1",
            player2: "p2",
            board: [
                [null, null, null],
                [null, null, null],
                [null, null, null]
            ],
            turn: "player1",
            game: "wait"
        });
        expect(typeof res.gameId).toBe("string");
        expect(res.gameId.length).toBeGreaterThan(1);
    });

    it("can drop an existing game", async () => {
        const res_c: api.CreateGameResponse = (
            await agent.post("/CreateGame").send(<api.CreateGameRequest>{
                player1Id: "p1",
                player2Id: "p2"
            })
        ).body;

        const res_d: api.DropGameResponse = (
            await agent
                .post(`/DropGame/${res_c.gameId}`)
                .send(<api.DropGameRequest>{})
                .expect(200)
        ).body;

        expect(res_d.success).toBeTruthy();
    });

    it("can check state of an existing game", async () => {
        const res_c: api.CreateGameResponse = (
            await agent.post("/CreateGame").send(<api.CreateGameRequest>{
                player1Id: "p1",
                player2Id: "p2"
            })
        ).body;

        const res: api.CheckGameResponse = (
            await agent.get(`/CheckGame/${res_c.gameId}`).expect(200)
        ).body;

        expect(res.success).toBeTruthy();
        const { id, ...withoutID } = res.state;
        expect(withoutID).toEqual(<api.GameState>{
            player1: "p1",
            player2: "p2",
            board: [
                [null, null, null],
                [null, null, null],
                [null, null, null]
            ],
            turn: "player1",
            game: "wait"
        });
    });

    it("can make a game move", async () => {
        const res_c: api.CreateGameResponse = (
            await agent.post("/CreateGame").send(<api.CreateGameRequest>{
                player1Id: "p1",
                player2Id: "p2"
            })
        ).body;

        const res: api.MakeMoveResponse = (
            await agent
                .post(`/MakeMove/${res_c.gameId}`)
                .send(<api.MakeMoveRequest>{
                    playerId: "p1",
                    move: { row: 1, column: 1 }
                })
                .expect(200)
        ).body;

        expect(res.success).toBeTruthy();
        const { id, ...withoutID } = res.newState;
        expect(withoutID).toEqual(<api.GameState>{
            player1: "p1",
            player2: "p2",
            board: [
                [null, null, null],
                [null, "p1", null],
                [null, null, null]
            ],
            turn: "player2",
            game: "wait"
        });
    });
});
