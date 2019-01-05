// STUB for implementation of database access

type GameId = string;

interface Game {
    state: string
}

interface DbConnector {
    /**
     * Load game record from the DB
     */
    LoadGame( id : GameId) : Promise<Game>;

    /**
     * Store/update game record into DB
     */
    SaveGame( id : GameId, game : Game ) : Promise<any>;

    /**
     * Obtain a unique unoccupied id in concurrent-safe manner
     */
    CreateGame( game: Game ) : Promise<GameId>;

    /**
     * Delete game
     */
    DropGame( id : GameId ) : Promise<any>;

    HasGame( id : GameId ) : Promise<boolean>;
};


export { GameId, Game, DbConnector}