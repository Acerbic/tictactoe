import { GameId } from 'ttt-db';
import { GameMasterGetRequest, GameMasterPostRequest, GameMasterResponse } from 'ttt-gmasterREST';
import fetch from 'isomorphic-unfetch';

// TODO: move to .env variable
const gmaster_url = `http://${process.env['GMASTER_URI']}/`;

/**
 * Call a GMaster POST Rest command.
 * (see https://www.notion.so/Game-master-58917c0a999e4df282f979a367c19760)
 * @param {string} endpoint rest endpoint name
 * @param {object} payload 
 * @param {string} gameId id of the game instance to affect
 */
async function gmasterPost(
            endpoint : string,
            payload : GameMasterPostRequest,
            gameId? : GameId) : Promise<GameMasterResponse> {

    const uri = gmaster_url + endpoint + (gameId ? ('/'+gameId) : '');
    const res = await fetch(uri, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    const json = res.json();
    json.catch((err:any) =>
        console.error(`gmaster.post (${uri})[${JSON.stringify(payload)}]: ${err}`)
    )
    return json;
};

/**
 * Call GMaster GET Rest command.
 * (see https://www.notion.so/Game-master-58917c0a999e4df282f979a367c19760)
 * @param {string} endpoint 
 * @param {string} gameId 
 */
async function gmasterGet( endpoint : string, gameId : GameId ) : Promise<GameMasterResponse> {
    const uri = gmaster_url + endpoint + (gameId ? ('/'+gameId) : '');
    const res = await fetch(uri, {
        method: 'GET',
    });
    return res.json();
};


class GMConnector { 
    post = gmasterPost;
    get = gmasterGet;
};

export = GMConnector;