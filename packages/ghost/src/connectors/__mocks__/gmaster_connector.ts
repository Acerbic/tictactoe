import GMC from "../gmaster_connector";
import * as gm_api from "@trulyacerbic/ttt-apis/gmaster-api";

export const { GMasterError } = jest.requireActual("../gmaster_connector");

/**
 * Substitute class. Note that this is a regular class with its members being
 * mock functions, not a mock-class (i.e. constructor is not mocked)
 *
 * @see https://jestjs.io/docs/en/es6-class-mocks#manual-mock-that-is-another-es6-class
 */
export default class GMConnector {
    // State of the game in progress (only single simultaneous game is supported)
    private gameState: gm_api.GameState = {
        id: "1111111",
        board: [
            [null, null, null],
            [null, null, null],
            [null, null, null]
        ],
        meta: null,
        game: "wait",
        turn: "player1",
        player1: "??? p1",
        player2: "??? p2"
    };

    // This is a ref to the last constructed instance of this class. It is used
    // by tests to access and override class methods implementation even if the
    // instance is created by source code and is not otherwise exposed.
    static instance: GMConnector | null = null;
    constructor() {
        GMConnector.instance = this;
    }

    get = jest
        .fn<ReturnType<GMC["get"]>, Parameters<GMC["get"]>>()
        .mockImplementation(() => {
            return Promise.resolve(<gm_api.CheckGameResponse>{
                success: true,
                state: this.gameState
            });
        });
    post = jest
        .fn<ReturnType<GMC["post"]>, Parameters<GMC["post"]>>()
        .mockImplementation((endpoint, payload) => {
            switch (endpoint) {
                case "CreateGame":
                    this.gameState = {
                        ...this.gameState,
                        player1: (payload as gm_api.CreateGameRequest)
                            .player1Id,
                        player2: (payload as gm_api.CreateGameRequest).player2Id
                    };
                    return Promise.resolve(<gm_api.CreateGameResponse>{
                        success: true,
                        gameId: this.gameState.id,
                        newState: JSON.parse(JSON.stringify(this.gameState))
                    });
                case "MakeMove":
                    const moveReq = payload as gm_api.MakeMoveRequest;

                    this.gameState.turn =
                        this.gameState.turn === "player1"
                            ? "player2"
                            : "player1";

                    this.gameState.board[moveReq.move.row][
                        moveReq.move.column
                    ] = moveReq.playerId;
                    return Promise.resolve(<gm_api.MakeMoveResponse>{
                        success: true,
                        newState: JSON.parse(JSON.stringify(this.gameState))
                    });
                case "DropGame":
                    return Promise.resolve(<gm_api.DropGameResponse>{
                        success: true
                    });

                default:
                    return Promise.reject({
                        success: false,
                        errorMessage: "Bad Endpoint: " + endpoint,
                        errorCode: 0
                    });
            }
        });
}
