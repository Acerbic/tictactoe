import { Game, DbConnector } from "./db";
import { GameId } from "@trulyacerbic/ttt-apis/gmaster-api";
import { query, Options } from "graphqurl";
import { GameNotFoundError } from "../routes/utils";

// TODO: more accurate error reporting (using response.error field from Hasura)

export class HasuraConnector implements DbConnector {
    options: Pick<Options, "endpoint" | "headers">;

    constructor(options: Pick<Options, "endpoint" | "headers">) {
        this.options = options;
    }

    /**
     * Load game record from the DB
     *
     * @throws GameNotFoundError, Error (from query() call)
     */
    async LoadGame(id: GameId): Promise<Game> {
        const q = `
            query ($id: uuid!) {
                gamesession_by_pk(id: $id) {
                    id
                    player1
                    player2
                    board
                    state
                }
            }
        `;

        return query({
            endpoint: this.options.endpoint,
            query: q,
            headers: this.options.headers,
            variables: { id }
        }).then(r => {
            const game = r?.data?.gamesession_by_pk;
            if (game?.id) {
                return game;
            } else {
                throw new GameNotFoundError("No such game session");
            }
        });
    }

    /**
     * Update game record into DB
     *
     * @throws GameNotFoundError, Error (from query() call)
     */
    async SaveGame(
        id: GameId,
        game: Pick<Game, "state" | "board">
    ): Promise<any> {
        const m = `
            mutation ($id: uuid!, $state: String!, $board: String!) {
                update_gamesession_by_pk(
                    pk_columns: {id: $id},
                    _set: {state: $state, board: $board}
                ) {
                    id
                }
            }
        `;

        return query({
            endpoint: this.options.endpoint,
            query: m,
            headers: this.options.headers,
            variables: { id, state: game.state, board: game.board }
        }).then(r => {
            if (r?.data?.update_gamesession_by_pk) {
                return r.data.update_gamesession_by_pk.id;
            } else {
                throw new GameNotFoundError("No such game session");
            }
        });
    }

    /**
     * Obtain a unique unoccupied id in concurrent-safe manner
     *
     * @throws Error
     */
    async CreateGame(game: Game): Promise<GameId> {
        const m = `
            mutation ($game: gamesession_insert_input!) {
                insert_gamesession_one(object: $game) {
                    id
                }
            }
        `;

        return query({
            endpoint: this.options.endpoint,
            query: m,
            headers: this.options.headers,
            variables: { game }
        }).then(r => {
            const id = r?.data?.insert_gamesession_one?.id;
            if (id) {
                return id;
            } else {
                throw Error("Failed to create a game");
            }
        });
    }

    /**
     * Delete game.
     * Request to delete a game with non-existant id does
     * nothing (noop) and only detectable by returning `null`
     * instead of the id of deleted game session.
     */
    async DropGame(id: GameId): Promise<any> {
        const m = `
            mutation ($id: uuid!) {
                delete_gamesession_by_pk(id: $id) {
                    id
                }
            }
        `;
        return query({
            endpoint: this.options.endpoint,
            query: m,
            headers: this.options.headers,
            variables: { id }
        }).then(r => {
            return r.data.delete_gamesession_by_pk.id;
        });
    }

    /**
     * Check if game is exising in the DB. ATTN: beware of racing conditions --
     * even if this call returns true, it might be stale short after in case of
     * concurent requests
     *
     * @throws Error if id is malformed or other error happened
     * @returns false if a gamesession with such id is not existing, true
     * otherwise
     */
    async HasGame(id: GameId): Promise<boolean> {
        const q = `
            query ($id: uuid!) {
                gamesession_by_pk(id: $id) {
                    id
                }
            }
        `;

        return query({
            endpoint: this.options.endpoint,
            query: q,
            headers: this.options.headers,
            variables: { id }
        }).then(r => (r.data?.gamesession_by_pk?.id && true) || false);
    }
}
