/**
 * Interfaces with Game Master proccess via http requests
 */

// Seems like this is not needed in Node v14, but in LTS (12)
// absense of this causes an error - Cannot find name 'URL'
// @see https://github.com/DefinitelyTyped/DefinitelyTyped/issues/34960

import { statelog, hostlog, errorlog, debuglog } from "../utils";
import { URL } from "url";

import {
    GameId,
    GameMasterGetRequest,
    GameMasterPostRequest,
    GameMasterResponse,
    APIResponse,
    APIResponseFailure,
    CheckGameResponse,
    ErrorCodes,
    APIResponseSuccess
} from "@trulyacerbic/ttt-apis/gmaster-api";
import fetch from "isomorphic-unfetch";

const gmaster_url = process.env["GMASTER_URL"];

export class GMasterError extends Error {
    code: ErrorCodes;
    constructor(apiRes: APIResponseFailure) {
        super(apiRes.errorMessage);
        this.code = apiRes.errorCode;
    }
}

/**
 * Call a GMaster POST Rest command.
 * (see https://www.notion.so/Game-master-58917c0a999e4df282f979a367c19760)
 * @param {string} endpoint rest endpoint name
 * @param {object} payload
 * @param {string} gameId id of the game instance to affect
 */
async function gmasterPost<
    TReq extends GameMasterPostRequest,
    TRes extends GameMasterResponse
>(endpoint: string, payload: TReq, gameId?: GameId): Promise<TRes> {
    const url = new URL(endpoint + (gameId ? "/" + gameId : ""), gmaster_url);
    const res = await fetch(url.toString(), {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    // TODO: investigate returned code 404 from request
    // res could be not 200 status, fetch doesn't catch?
    return res
        .json()
        .catch((err: any) => {
            errorlog(
                `gmaster.post (${url})[${JSON.stringify(
                    payload
                )}]: ${err} \n ~~ \n ${res.body}`
            );
            throw err;
        })
        .then((response: APIResponse) => {
            if (response.success) {
                return response as TRes;
            } else {
                // This is a GMaster internally produced error.
                throw new GMasterError(response);
            }
        });
}

/**
 * Call GMaster GET Rest command.
 * (see https://www.notion.so/Game-master-58917c0a999e4df282f979a367c19760)
 * @param {string} endpoint
 * @param {string} gameId
 */
async function gmasterGet<
    TReq extends GameMasterGetRequest = any,
    TRes extends GameMasterResponse = CheckGameResponse
>(endpoint: string, gameId: GameId): Promise<TRes> {
    const url = new URL(endpoint + (gameId ? "/" + gameId : ""), gmaster_url);
    const res = await fetch(url.toString(), {
        method: "GET"
    });
    return res.json().then((response: APIResponse) => {
        if (response.success) {
            return response as TRes;
        } else {
            // This is a GMaster internally produced error.
            throw new GMasterError(response);
        }
    });
}

class GMConnector {
    post = gmasterPost;
    get = gmasterGet;
}

export default GMConnector;
