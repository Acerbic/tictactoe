type GameId = string;
type PlayerId = string;

interface Game {
    state: string; // JSON-serialized machine state
    board: string; // JSON-serialized board state

    player1?: PlayerId;
    player2?: PlayerId;
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


export { GameId, PlayerId, Game, DbConnector}