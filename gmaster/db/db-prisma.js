const { prisma } = require('./prisma-client')

/**
 * Load game record from the DB
 * @param {string} id - id of the game
 * @returns {object}
 */
async function LoadGame( id ) {
    return prisma.gameSession( {id} );
}

/**
 * Store/update game record into DB
 * @param {string} id - id of the game
 * @param {object} game
 */
async function SaveGame( id, game ) {
    return prisma.updateGameSession({
        data: game,
        where: { id }
    });
}

/**
 * Obtain a unique unoccupied id in concurrent-safe manner
 * @returns {string} - id of the game created
 */
async function CreateGame( game ) {
    const newGame = await prisma.createGameSession({
        player1: game.player1,
        player2: game.player2,
        state: game.state,
        board: game.board
    });
    return newGame.id;
}

/**
 * Delete game
 * @param {string} id - id of the gamed int database
 */
async function DropGame( id ) {
    prisma.deleteGameSession( {id} )
}

/**
 * Check if the game exists
 * @param {string} id - id of the gamed int database
 * @returns {boolean} - true if game exists, false otherwise
 */
async function HasGame( id ) {
    return 1 == prisma.gameSessionsConnection( {where: {id}} ).aggregate().count();
}

module.exports = {LoadGame, SaveGame, CreateGame, DropGame, HasGame};