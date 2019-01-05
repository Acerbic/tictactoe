const fetch = require('isomorphic-unfetch');

// TODO: move to .env variable
const gmaster_url = 'http://gmaster:3000/';

/**
 * Call a GMaster POST Rest command.
 * (see https://www.notion.so/Game-master-58917c0a999e4df282f979a367c19760)
 * @param {string} endpoint rest endpoint name
 * @param {object} payload 
 * @param {string} gameId id of the game instance to affect
 */
async function gmasterPost( endpoint, payload, gameId ) {
    const uri = gmaster_url + endpoint + (gameId ? ('/'+gameId) : '');
    const res = await fetch(uri, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    const json = res.json();
    json.catch(err =>
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
async function gmasterGet( endpoint, gameId ) {
    const uri = gmaster_url + endpoint + (gameId ? ('/'+gameId) : '');
    const res = await fetch(uri, {
        method: 'GET',
    });
    return res.json();
};

module.exports = { get: gmasterGet, post: gmasterPost }