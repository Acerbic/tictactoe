/**
 * Type definitions for GMaster <-> DBStorage connection interface
 * (used internally in gmaster)
 */
import { GameId, PlayerId } from "@trulyacerbic/ttt-apis/gmaster-api";

/**
 * Preserved state of a game, as it is being saved to a DB
 */
interface Game {
    state: string; // JSON-serialized machine StateValue

    player1: PlayerId;
    player2: PlayerId;
    meta: any;
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
    SaveGame(
        id: GameId,
        game: Partial<Pick<Game, "state" | "meta">>
    ): Promise<any>;

    /**
     * Obtain a unique unoccupied id in concurrent-safe manner
     */
    CreateGame(game: Game): Promise<GameId>;

    /**
     * Delete game
     */
    DropGame(id: GameId): Promise<any>;

    HasGame(id: GameId): Promise<boolean>;

    // Maintenance
    Stats(): Promise<any>;
    Upkeep(): Promise<any>;
}

export { Game, DbConnector };
