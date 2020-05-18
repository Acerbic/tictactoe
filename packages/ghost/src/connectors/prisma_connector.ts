/**
 * Connects directly to the game storage to retrieve game data (for reads unrelated to game progression)
 */

import { GameId } from "@trulyacerbic/ttt-apis/gmaster-api";
import { GameBoard } from "@trulyacerbic/ttt-apis/ghost-api";
import { prisma } from "@trulyacerbic/ttt-gamesdb";

export type PrismaGetGameBoard = (gameId: GameId) => Promise<GameBoard>;

/**
 * Load game record from the DB and return the board
 */
export const getGameBoard: PrismaGetGameBoard = async function getGameBoard(
    gameId: GameId
) {
    const game = await prisma.gameSession({ id: gameId });
    if (game === null) {
        throw "Can't get game board";
    }
    return JSON.parse(game.board) as GameBoard;
};
