// FIXME: publish prisma-client as a module and npm-install it
const { prisma } = require('../gamesdb/generated/prisma-client')

/**
 * Load game record from the DB and return the board
 * @param {int} gameId 
 * @returns {object}
 */
async function GetGameBoard( gameId ) {
    const game = await prisma.gameSession( {id: gameId} );
    return JSON.parse(game.board);
}

module.exports = {GetGameBoard}