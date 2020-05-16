import { APIResponseFailure } from "../gmaster_api";
import GMC from "../gmaster_connector";

const m_gmasterPost = jest
    .fn<ReturnType<GMC["post"]>, Parameters<GMC["post"]>>()
    .mockResolvedValue(<APIResponseFailure>{
        success: false,
        errorCode: 0,
        errorMessage: "Mocked response"
    });
const m_gmasterGet = jest.fn().mockResolvedValue(<APIResponseFailure>{
    success: false,
    errorCode: 0,
    errorMessage: "Mocked response"
});

export default jest
    .fn()
    .mockName("GMConnector")
    .mockImplementation(() => ({
        get: m_gmasterGet,
        post: m_gmasterPost
    }));
