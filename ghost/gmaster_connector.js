const fetch = require('isomorphic-unfetch');

// TODO: move to .env variable
const gmaster_url = 'http://localhost:3000/';

async function gmasterPost( endpoint, payload, gameId ) {
    const uri = gmaster_url + endpoint + gameId ? gameId : '';
    const res = await fetch(uri, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    return res.json();
};

async function gmasterGet( endpoint, gameId ) {
    const uri = gmaster_url + endpoint + gameId ? gameId : '';
    const res = await fetch(gmaster_url + endpoint, {
        method: 'GET',
    });
    return res.json();
};

module.exports = { get: gmasterGet, post: gmasterPost }