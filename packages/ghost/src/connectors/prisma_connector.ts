import { GameId } from 'ttt-db';
import { prisma } from '@trulyacerbic/ttt-gamesdb';

export type PrismaGetGameBoard = ( gameId: GameId ) => Promise<Array<Array<any>>>;

/**
 * Load game record from the DB and return the board
 * @param {string} gameId
 * @returns {object} game board (array[3][3])
 */
export async function GetGameBoard<PrismaGetGameBoard>( gameId : GameId ) : Promise<Array<Array<any>>> {
    const game = await prisma.gameSession( {id: gameId} );
    return JSON.parse(game.board);
}