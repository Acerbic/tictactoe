/**
 * Type definitions for GMaster <-> DBStorage connection interface
 * (used internally in gmaster)
 */
import { GameId, PlayerId } from "../routes/api";

/**
 * Preserved state of a game
 */
interface Game {
    state: string; // JSON-serialized machine StateValue
    board: string; // JSON-serialized board state from Context

    player1: PlayerId;
    player2: PlayerId;
}

/**
 * Operates of Storage (CRUD)
 */
interface DbConnector {
    /**
     * Load game record from the DB
     */
    LoadGame(id: GameId): Promise<Game>;

    /**
     * Update game record into DB
     */
    SaveGame(id: GameId, game: Pick<Game, "state" | "board">): Promise<any>;

    /**
     * Obtain a unique unoccupied id in concurrent-safe manner
     */
    CreateGame(game: Game): Promise<GameId>;

    /**
     * Delete game
     */
    DropGame(id: GameId): Promise<any>;

    HasGame(id: GameId): Promise<boolean>;
}

export { Game, DbConnector };
