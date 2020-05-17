import { APIResponseFailure } from "@trulyacerbic/ttt-apis/gmaster-api";

export function makeFailureResponse(
    err?: any,
    message?: APIResponseFailure["errorMessage"],
    code?: APIResponseFailure["errorCode"]
): APIResponseFailure {
    let responseBody: APIResponseFailure;
    if (
        typeof err === "object" &&
        typeof err.errorMessage !== "undefined" &&
        typeof err.errorCode !== "undefined"
    ) {
        responseBody = Object.assign({}, err);
    } else {
        responseBody = {
            success: false,
            errorCode: 0,
            errorMessage: "Unknown error"
        };
    }

    if (err instanceof Error) {
        responseBody.errorMessage = err.message;
    }

    if (typeof message !== "undefined") {
        responseBody.errorMessage = message;
    }

    if (typeof code !== "undefined") {
        responseBody.errorCode = code;
    }

    return responseBody;
}
