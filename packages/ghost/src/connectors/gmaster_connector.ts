/**
 * Interfaces with Game Master proccess via http requests
 */
import {
    GameId,
    GameMasterGetRequest,
    GameMasterPostRequest,
    GameMasterResponse,
    APIResponse,
    APIResponseFailure,
    CheckGameResponse
} from "@trulyacerbic/ttt-apis/gmaster-api";
import fetch from "isomorphic-unfetch";

const gmaster_url = process.env["GMASTER_URL"];

/**
 * Call a GMaster POST Rest command.
 * (see https://www.notion.so/Game-master-58917c0a999e4df282f979a367c19760)
 * @param {string} endpoint rest endpoint name
 * @param {object} payload
 * @param {string} gameId id of the game instance to affect
 */
async function gmasterPost<
    TReq extends GameMasterPostRequest,
    TRes extends APIResponse = APIResponse
>(
    endpoint: string,
    payload: TReq,
    gameId?: GameId
): Promise<TRes | APIResponseFailure> {
    const uri = gmaster_url + endpoint + (gameId ? "/" + gameId : "");
    const res = await fetch(uri, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });
    const json = res.json();
    json.catch((err: any) =>
        console.error(
            `gmaster.post (${uri})[${JSON.stringify(payload)}]: ${err}`
        )
    );
    return json;
}

/**
 * Call GMaster GET Rest command.
 * (see https://www.notion.so/Game-master-58917c0a999e4df282f979a367c19760)
 * @param {string} endpoint
 * @param {string} gameId
 */
async function gmasterGet<
    TReq extends GameMasterGetRequest = any,
    TRes extends APIResponse = CheckGameResponse
>(endpoint: string, gameId: GameId): Promise<TRes | APIResponseFailure> {
    const uri = gmaster_url + endpoint + (gameId ? "/" + gameId : "");
    const res = await fetch(uri, {
        method: "GET"
    });
    return res.json();
}

class GMConnector {
    post = gmasterPost;
    get = gmasterGet;
}

export default GMConnector;
