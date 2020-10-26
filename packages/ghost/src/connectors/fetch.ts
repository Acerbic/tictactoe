/**
 * Custom fetch with retry
 */

import originalFetch from "isomorphic-unfetch";
import fetchFactory from "fetch-retry";
import AbortController from "abort-controller";

import { debuglog } from "../utils";

export const REQUEST_TIMEOUT = 4000;
export const RETRY_DELAY = 1000;
export const RETRIES = 3;

const originalFetchAbortable = (input: any, init: any) => {
    const ac = new AbortController();
    setTimeout(() => ac.abort(), REQUEST_TIMEOUT);
    return originalFetch(input, {
        ...init,
        signal: ac.signal
    });
};

export const fetch = fetchFactory(originalFetchAbortable, {
    retries: RETRIES,
    retryDelay: RETRY_DELAY,
    retryOn: (attempt: number, error: any, response: any) => {
        if (attempt > 0 || error || response.status !== 200) {
            debuglog(
                `Attempt: ${attempt}; error: ${
                    error ? error.type : "-"
                }; res: ${response ? response.status : "-"}`
            );
        }
        const retry =
            ((error && error.type !== "aborted") ||
                (response && response.status >= 500)) &&
            attempt < RETRIES - 1;
        debuglog(!retry && "Will stop retries");
        return retry;
    }
});

export default fetch;
