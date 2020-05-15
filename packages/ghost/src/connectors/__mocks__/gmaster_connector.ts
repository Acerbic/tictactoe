import {
    GameId,
    GameMasterGetRequest,
    GameMasterPostRequest,
    GameMasterResponse,
    APIResponse,
    APIResponseFailure,
    CheckGameResponse
} from "../gmaster_api";

export const gmasterPost = jest.fn().mockResolvedValue(<APIResponseFailure>{
    success: false,
    errorCode: 0,
    errorMessage: "Mocked response"
});
export const gmasterGet = jest.fn().mockResolvedValue(<APIResponseFailure>{
    success: false,
    errorCode: 0,
    errorMessage: "Mocked response"
});

export default jest
    .fn()
    .mockName("GMConnector")
    .mockImplementation(() => ({
        get: gmasterGet,
        post: gmasterPost
    }));
