/**
 * Connects directly to the game storage to retrieve game data (for reads unrelated to game progression)
 */

import { GameId } from "./gmaster_api";
import { prisma } from "@trulyacerbic/ttt-gamesdb";

export type GameBoard = [
    [string?, string?, string?],
    [string?, string?, string?],
    [string?, string?, string?]
];
export type PrismaGetGameBoard = (gameId: GameId) => Promise<GameBoard>;

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
    return JSON.parse(game.board) as GameBoard;
};
