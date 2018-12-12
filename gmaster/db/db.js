// STUB for implementation of database access

/**
 * Load game record from the DB
 * @param {string} id - id of the game
 * @returns {object}
 */
async function LoadGame( id ) {
    throw new Exception( "Not implemented" );
}

/**
 * Store/update game record into DB
 * @param {string} id - id of the game
 * @param {object} game
 */
async function SaveGame( id, game ) {
    throw new Exception( "Not implemented" );
}

/**
 * Obtain a unique unoccupied id in concurrent-safe manner
 * @returns {string} - id of the game created
 */
async function CreateGame( game ) {
    throw new Exception( "Not implemented" );
}

/**
 * Delete game
 * @param {string} id - id of the gamed int database
 */
async function DropGame( id ) {
    throw new Exception( "Not implemented" );
}

/**
 * Check if the game exists
 * @param {string} id - id of the gamed int database
 * @returns {boolean} - true if game exists, false otherwise
 */
async function HasGame( id ) {
    throw new Exception( "Not implemented" );
}

module.exports = {LoadGame, SaveGame, CreateGame, DropGame, HasGame};