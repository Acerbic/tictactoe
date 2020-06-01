/**
 * Connects directly to the game storage to retrieve game data (for reads unrelated to game progression)
 */

import { GameId } from "@trulyacerbic/ttt-apis/gmaster-api";
import { GameBoard } from "@trulyacerbic/ttt-apis/ghost-api";
import { query } from "graphqurl";

export type DBGetGameBoard = (gameId: GameId) => Promise<GameBoard>;

/**
 * Load game record from the DB and return the board
 */
export const getGameBoard: DBGetGameBoard = async function getGameBoard(
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
        endpoint: process.env.HASURA_URL!,
        query: q,
        variables: { id: gameId }
    }).then(r => {
        const game = r?.data?.gamesession_by_pk;
        if (game?.board) {
            return JSON.parse(game.board);
        } else {
            throw new Error("Can't get game board");
        }
    });
};
