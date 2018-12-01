// In-memory "db"

let games = new Map();
let lastGameId = 0;

function LoadGame( gameId ) {
    if (games.has(gameId)) {
        return games.get(gameId);
    } else {
        throw new Exception("Game not found");
    }
}

function SaveGame( gameId, game ) {
    games.set(gameId, game)
}

function GenerateNewId() {
    return ++lastGameId;
}

function DropGame( gameId ) {
    games.delete(gameId);
}

function HasGame( gameId ) {
    return games.has(gameId);
}

module.exports = {LoadGame, SaveGame, GenerateNewId, DropGame, HasGame};