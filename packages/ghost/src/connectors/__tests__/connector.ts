/**
 * Test operations and failing of remote API connections.
 */

import http from "http";
import express from "express";

process.env["GMASTER_URL"] = "http://localhost:9999";
import { GameMasterConnector } from "../gmaster_connector";
import { REQUEST_TIMEOUT, RETRY_DELAY, RETRIES } from "../fetch";
import { CheckGameResponse } from "@trulyacerbic/ttt-apis/gmaster-api";

import { debuglog } from "../../utils";

describe("test gmaster connector", () => {
    let clock: NodeJS.Timeout;
    beforeEach(() => {
        clock = setInterval(() => {
            jest.advanceTimersByTime(1000);
        }, 10);
        jest.useFakeTimers();
    });
    afterEach(() => {
        jest.useRealTimers();
        clearInterval(clock);
    });
    it("should fail on gmaster down", done => {
        const connector: GameMasterConnector = new GameMasterConnector();
        const checkPromise = connector.get("CheckGame", "111");
        checkPromise
            .then(r => {})
            .catch(r => {
                done();
            });
    });

    it("should retry requests for a few seconds", () => {
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
            debuglog("starting the server");
            server.listen(9999);
            // prevent server hanging after the test is done
            checkPromise.finally(() => {
                server.close();
                return new Promise(rs => server.once("close", rs));
            });
            // NOTE: if this timeout is too long, it exceeds connectors wait
            // period and the test fails (as it should)
        }, RETRY_DELAY);

        return checkPromise;
    });

    it(
        "should cancel requests if connection times out",
        () => {
            // Creating a stub server
            const app = express();
            app.use(express.json());
            app.get("/CheckGame/:gameId", (req, res) => {
                // Hung server
                debuglog("server request");
            });
            const server = http.createServer(app);
            server.listen(9999);

            let hungTimeout: NodeJS.Timeout;
            const hungDetector = new Promise((rs, rj) => {
                hungTimeout = setTimeout(() => {
                    debuglog("server hung");
                    rj("server hung");
                }, REQUEST_TIMEOUT + RETRY_DELAY);
            });

            // start a failing request
            const connector: GameMasterConnector = new GameMasterConnector();
            const checkPromise = connector
                .get("CheckGame", "111")
                .then(() => {})
                // Must have a catch clause to prevent
                // UnhandledPromiseRejectionWarning
                .catch(r => {
                    debuglog("request exception");
                    expect(r.type).toBe("aborted");
                });

            return Promise.race([hungDetector, checkPromise]).finally(() => {
                debuglog("race finally");
                server.close(e => {
                    debuglog("server close error", e);
                });
                clearTimeout(hungTimeout);
                return new Promise(rs => server.once("close", rs));
            });
        },
        REQUEST_TIMEOUT + 1000
    );
});
