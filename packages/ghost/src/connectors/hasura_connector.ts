/**
 * Connects directly to the game storage to retrieve game data (for reads unrelated to game progression)
 */

import { GameId } from "@trulyacerbic/ttt-apis/gmaster-api";
import { GameBoard } from "@trulyacerbic/ttt-apis/ghost-api";
// import { prisma } from "@trulyacerbic/ttt-gamesdb";
import { query } from "graphqurl";

export type PrismaGetGameBoard = (gameId: GameId) => Promise<GameBoard>;

/**
 * Load game record from the DB and return the board
 */
export const getGameBoard: PrismaGetGameBoard = async function getGameBoard(
    gameId: GameId
) {
    const q = `
        query ($id: uuid!) {
            gamesession_by_pk(id: $id) {
                board
            }
        }
    `;

    return query({
        endpoint: "http://localhost:8080/v1/graphql",
        query: q,
        variables: { id: gameId }
    }).then(r => {
        const game = r?.data?.gamesession_by_pk;
        if (game?.board) {
            return JSON.parse(game.board);
        } else {
            throw "Can't get game board";
        }
    });
};
