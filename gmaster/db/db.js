
/**
 * Load game record from the DV
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
function SaveGame( gameId ) {
    throw new Exception( "Not implemented" );
}

/**
 * Obtain a unique unoccupied id in concurrent-safe manner
 * @returns {int}
 */
function GenerateNewId() {
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

module.exports = {LoadGame, SaveGame, GenerateNewId, DropGame, HasGame};