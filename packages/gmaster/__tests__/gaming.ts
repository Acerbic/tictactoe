/**
 * Playing example matches, as intended.
 *
 * See note.md for details on env vars
 */

import supertest from "supertest";
import { generateAppExt } from "./__generateApp.wrap";

import * as api from "@trulyacerbic/ttt-apis/gmaster-api";

const agent: ReturnType<typeof supertest.agent> = supertest
    .agent(generateAppExt())
    .type("json") as any; // :( bad type definitions in @types/supertest

describe("Demo matches", () => {
    const player1Id = "p1";
    const player2Id = "p2";

    it("should go through full game cycle - p1 wins", async () => {
        let gameId = null;

        // creating a game
        const res_create: api.CreateGameResponse = (
            await agent
                .post("/CreateGame")
                .send(<api.CreateGameRequest>{ player1Id, player2Id })
                .expect(200)
        ).body;

        expect(res_create.success).toBe(true);
        gameId = res_create.gameId;
        expect(gameId).not.toBeFalsy();

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

        // double check game state was persisted correctly
        const res_check: api.CheckGameResponse = (
            await agent.get("/CheckGame/" + gameId)
        ).body;

        expect(res_check.success).toBe(true);
        expect(res_check.state.game).toBe("over");
        expect(res_check.state.turn).toBe("player2");

        // delete the game from records
        const res_drop: api.DropGameResponse = (
            await agent.post("/DropGame/" + gameId).expect(200)
        ).body;

        expect(res_drop.success).toBe(true);
    });

    it("should go through full game cycle - draw", async () => {
        let gameId = null;

        // creating a game
        const res_create: api.CreateGameResponse = (
            await agent
                .post("/CreateGame")
                .send(<api.CreateGameRequest>{ player1Id, player2Id })
                .expect(200)
        ).body;

        expect(res_create.success).toBe(true);
        gameId = res_create.gameId;

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

        await agent
            .post("/MakeMove/" + gameId)
            .send(<api.MakeMoveRequest>{
                playerId: player1Id,
                move: { row: 1, column: 2 }
            })
            .expect(200);
        await agent
            .post("/MakeMove/" + gameId)
            .send(<api.MakeMoveRequest>{
                playerId: player2Id,
                move: { row: 0, column: 2 }
            })
            .expect(200);
        await agent
            .post("/MakeMove/" + gameId)
            .send(<api.MakeMoveRequest>{
                playerId: player1Id,
                move: { row: 2, column: 0 }
            })
            .expect(200);
        await agent
            .post("/MakeMove/" + gameId)
            .send(<api.MakeMoveRequest>{
                playerId: player2Id,
                move: { row: 2, column: 1 }
            })
            .expect(200);

        const res_mov: api.MakeMoveResponse = (
            await agent
                .post("/MakeMove/" + gameId)
                .send(<api.MakeMoveRequest>{
                    playerId: player1Id,
                    move: { row: 2, column: 2 }
                })
                .expect(200)
        ).body;

        // make sure last move brings draw
        expect(res_mov.success).toBe(true);
        expect(res_mov.newState.game).toBe("draw");
        expect(res_mov.newState.turn).toBe("player2");

        // double check game state was persisted correctly
        const res_check: api.CheckGameResponse = (
            await agent.get("/CheckGame/" + gameId)
        ).body;

        expect(res_check.success).toBe(true);
        expect(res_check.state.game).toBe("draw");
        expect(res_check.state.turn).toBe("player2");

        // delete the game from records
        const res_drop: api.DropGameResponse = (
            await agent.post("/DropGame/" + gameId).expect(200)
        ).body;

        expect(res_drop.success).toBe(true);
    });
});
