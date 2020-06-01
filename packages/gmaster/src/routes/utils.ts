import {
    APIResponseFailure,
    ErrorCodes
} from "@trulyacerbic/ttt-apis/gmaster-api";

/**
 * Constructs API failure response from either Error object or custom message
 * and code.
 *
 * - If `err` is `APIResponseFailure`, it is returned.
 * - If `err` is instance of `Error`, the `APIResponseFailure` is build from it
 *   and returned.
 * - Otherwise, `APIResponseFailure` is constructed from given `message` and
 *   `code` with defaults to "Unknown Error"
 */
export function makeFailureResponse(
    err?: APIResponseFailure | Error | any,
    message?: APIResponseFailure["errorMessage"],
    code?: APIResponseFailure["errorCode"]
): APIResponseFailure {
    if (
        typeof err === "object" &&
        typeof err.errorMessage !== "undefined" &&
        typeof err.errorCode !== "undefined"
    ) {
        // already an instance of APIResponseFailure
        return Object.assign({}, err, { success: false });
    }

    const responseBody: APIResponseFailure = {
        success: false,
        errorCode: ErrorCodes.UNKNOWN_ERROR,
        errorMessage: "Unknown error"
    };

    if (err instanceof Error) {
        responseBody.errorMessage = err.toString();
        switch (true) {
            case err instanceof BadArgumentsError:
                responseBody.errorCode = ErrorCodes.UNKNOWN_ERROR;
                break;
            case err instanceof GameNotFoundError:
                responseBody.errorCode = ErrorCodes.GAME_NOT_FOUND;
                break;
            default:
                responseBody.errorCode = ErrorCodes.UNKNOWN_ERROR;
        }
        return responseBody;
    }

    if (typeof message !== "undefined") {
        responseBody.errorMessage = message;
    }

    if (typeof code !== "undefined") {
        responseBody.errorCode = code;
    }

    return responseBody;
}

/** Bad REST API call arguments */
export class BadArgumentsError extends Error {
    constructor(msg: string = "Bad Arguments") {
        super(msg);
    }
}

/** Game for given ID is not found in the DB */
export class GameNotFoundError extends Error {
    constructor(msg: string = "Requested game not found") {
        super(msg);
    }
}
