import { Game, DbConnector } from "./db";
import { GameId } from "@trulyacerbic/ttt-apis/gmaster-api";
import { query, Options } from "graphqurl";

// TODO: more accurate error reporting (using response.error field from Hasura)

export class HasuraConnector implements DbConnector {
    options: Pick<Options, "endpoint" | "headers">;

    constructor(options: Pick<Options, "endpoint" | "headers">) {
        this.options = options;
    }

    /**
     * Load game record from the DB
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
                throw "No such game session";
            }
        });
    }

    /**
     * Update game record into DB
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
            if (r?.data) {
                return r.data?.update_gamesession_by_pk;
            } else {
                throw "Some error happened while updating a game";
            }
        });
    }

    /**
     * Obtain a unique unoccupied id in concurrent-safe manner
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
                throw "Failed to create a game";
            }
        });
    }

    /**
     * Delete game
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
            if (r?.data?.delete_gamesession_by_pk) {
                return r.data.delete_gamesession_by_pk.id;
            } else {
                throw "Error while deleting a game";
            }
        });
    }

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
