const { prisma } = require('./prisma-client')

/**
 * Load game record from the DB and return the board
 * @param {int} gameId
 * @returns {object} game board (array[3][3])
 */
async function GetGameBoard( gameId ) {
    const game = await prisma.gameSession( {id: gameId} );
    return JSON.parse(game.board);
}

module.exports = {GetGameBoard}