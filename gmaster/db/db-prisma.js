// FIXME: publish prisma-client as a module and npm-install it
const { prisma } = require('../../gamesdb/generated/prisma-client')

/**
 * Load game record from the DB
 * @param {int} gameId 
 * @returns {object}
 */
async function LoadGame( gameId ) {
    return prisma.gameSession( {gameId} );
}

/**
 * Store/update game record into DB
 * @param {int} gameId 
 * @param {object} game
 */
async function SaveGame( gameId, game ) {
    return prisma.updateGameSession({
        data: game,
        where: {
            id: gameId
        }
    });
}

/**
 * Obtain a unique unoccupied id in concurrent-safe manner
 * @returns {int}
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
 * @param {int} gameId 
 */
async function DropGame( gameId ) {
    prisma.deleteGameSession( {id: gameId} )
}

/**
 * Check if the game exists
 * @param {int} gameId 
 * @returns {boolean}
 */
async function HasGame( gameId ) {
    return 1 == prisma.gameSessions( {id: gameId} ).aggregate().count();
}

module.exports = {LoadGame, SaveGame, CreateGame, DropGame, HasGame};