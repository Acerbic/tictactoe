/**
 * Process env vars flags and decorate generateApp(), as an argument to
 * initialize agent()
 *
 * See `note.md` for meaning of GMASTER_URL, MOCK_DB, HASURA_URL env vars.
 */

import { Express } from "express";
import generateApp from "../src/app";

import { DbConnectorMock } from "./__db-hasura.mock";

export let useRemoteGmaster = false;
export let mockDB = !!process.env.MOCK_DB;
try {
    new URL(process.env.GMASTER_URL!);
    useRemoteGmaster = true;
} catch (e) {
    try {
        new URL(process.env.HASURA_URL!);
    } catch (ee) {
        if (!mockDB) {
            // problem! MOCK_DB isn't set, but HASURA_URL is not good
            throw new Error(
                "If MOCK_DB is not set, HASURA_URL must be set" +
                    " to point to a proper Hasura GraphQL Engine."
            );
        }
    }
}

export const generateAppExt = () => {
    const agent_app_arg = useRemoteGmaster
        ? process.env.GMASTER_URL
        : generateApp();

    if (mockDB) {
        (agent_app_arg as Express).set("gamesDb", new DbConnectorMock());
    }
    return agent_app_arg;
};
