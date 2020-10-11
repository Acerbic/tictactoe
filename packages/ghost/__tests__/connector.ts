/**
 * Test operations and failing of remote API connections.
 */

import http from "http";
import express from "express";

process.env["GMASTER_URL"] = "http://localhost:9999";
import { GameMasterConnector } from "../src/connectors/gmaster_connector";
import { CheckGameResponse } from "@trulyacerbic/ttt-apis/gmaster-api";

describe("test gmaster connector", () => {
    it("should fail on gmaster down", done => {
        jest.useFakeTimers();

        const connector: GameMasterConnector = new GameMasterConnector();
        const checkPromise = connector.get("CheckGame", "111");
        jest.advanceTimersByTime(6000);

        checkPromise.catch(() => done());
    });

    it.only("should retry requests for a few seconds", () => {
        // Creating a stub server
        const app = express();
        app.use(express.json());
        app.get("/CheckGame/:gameId", (req, res) => {
            res.send(<CheckGameResponse>{
                success: true,
                state: {}
            });
        });
        const server = http.createServer(app);

        // start failing request
        // jest.useFakeTimers();
        const connector: GameMasterConnector = new GameMasterConnector();
        let serverTimeout: NodeJS.Timeout;

        const checkPromise = connector
            .get("CheckGame", "111")
            .then(() => {})
            // Must have a catch clause to prevent UnhandledPromiseRejectionWarning
            .catch(r => {
                // shortcut test when fails
                clearTimeout(serverTimeout);
                // re-throw to fail the test
                throw r;
            });

        // after 2 seconds enable stub server
        serverTimeout = setTimeout(() => {
            server.listen(9999);
            // prevent server hanging after the test is done
            checkPromise.finally(() => {
                server.close();
            });
            // NOTE: if this timeout is too long, it exceeds connectors wait
            // period and the test fails (as it should)
        }, 1900);
        // setTimeout(() => {
        // jest.advanceTimersByTime(2000);
        // }, 0);

        return checkPromise;
    });
});
