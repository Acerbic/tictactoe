
/**
 * Load game record from the DB
 * @param {int} gameId 
 * @returns {object}
 */
function LoadGame( gameId ) {
    throw new Exception( "Not implemented" );
}

/**
 * Store/update game record into DB
 * @param {int} gameId 
 */
function SaveGame( gameId, game ) {
    throw new Exception( "Not implemented" );
}

/**
 * Create new game session in DB and return its ID
 * @returns {int}
 */
function CreateGame( game ) {
    throw new Exception( "Not implemented" );
}

/**
 * Delete game
 * @param {int} gameId 
 */
function DropGame( gameId ) {
    throw new Exception( "Not implemented" );
}

/**
 * Check if the game exists
 * @param {int} gameId 
 * @returns {boolean}
 */
function HasGame( gameId ) {
    throw new Exception( "Not implemented" );
}

module.exports = {LoadGame, SaveGame, CreateGame, DropGame, HasGame};