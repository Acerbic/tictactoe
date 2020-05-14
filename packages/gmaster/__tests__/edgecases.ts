/**
 * Testing various modes of failure
 */
import supertest from "supertest";
import generateApp from "../src/app";

import * as api from "../src/routes/api";

/**
 * If provided string endpoint (in the form of URI like
 * "http://localhost:3000"), use it. Otherwise, instantiate a new web
 * application from source code (in this case, don't forget to set up PRISMA_URL
 * env variable to point to prisma storage)
 */
// const agent_app =
//     "string" === typeof process.env.ENDPOINT && process.env.ENDPOINT.length > 0
//         ? process.env.ENDPOINT
//         : generateApp();
// const agent: ReturnType<typeof supertest.agent> = supertest
//     .agent(agent_app)
//     .type("json") as any; // :( bad type definitions in @types/supertest

it("should fail to start the server if PRISMA_URL unset", () => {
    const oldPRISMA_URL = process.env.PRISMA_URL;
    delete process.env.PRISMA_URL;
    expect(generateApp).toThrow();
    process.env.PRISMA_URL = "malformedurl";
    expect(generateApp).toThrow();
    process.env.PRISMA_URL = oldPRISMA_URL;
});

it("should error if prisma storage is unavailable", async () => {
    const oldPRISMA_URL = process.env.PRISMA_URL;
    process.env.PRISMA_URL = "http://localhost:59999"; // fakeout
    const misdirectedApp = generateApp();
    process.env.PRISMA_URL = oldPRISMA_URL;
    const res: api.APIResponseFailure = (await supertest(misdirectedApp)
        .post("/CreateGame")
        .type("json")
        .send(<api.CreateGameRequest>{
            player1Id: "p1",
            player2Id: "p2"
        })
        .expect(200)).body;

    expect(res.success).toBe(false);
});
