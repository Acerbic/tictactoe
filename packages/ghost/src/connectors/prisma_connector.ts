/**
 * Connects directly to the game storage to retrieve game data (for reads unrelated to game progression)
 */

import { GameId } from "ttt-db";
import { prisma } from "@trulyacerbic/ttt-gamesdb";

export type PrismaGetGameBoard = (gameId: GameId) => Promise<Array<Array<any>>>;

/**
 * Load game record from the DB and return the board
 */
export const GetGameBoard: PrismaGetGameBoard = async function GetGameBoard(
    gameId: GameId
) {
    const game = await prisma.gameSession({ id: gameId });
    if (game === null) {
        throw "Can't get game board";
    }
    return JSON.parse(game.board) as Array<Array<any>>;
};
