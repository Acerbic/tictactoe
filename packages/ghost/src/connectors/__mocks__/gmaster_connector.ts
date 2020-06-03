import GMC from "../gmaster_connector";

export const { GMasterError } = jest.requireActual("../gmaster_connector");

const m_gmasterPost = jest.fn<
    ReturnType<GMC["post"]>,
    Parameters<GMC["post"]>
>();
const m_gmasterGet = jest.fn<ReturnType<GMC["get"]>, Parameters<GMC["get"]>>();

export default jest
    .fn()
    .mockName("GMConnector")
    .mockImplementation(() => ({
        get: m_gmasterGet,
        post: m_gmasterPost
    }));
