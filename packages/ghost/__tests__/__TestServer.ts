/**
 * Reused code to start up a testing GHost server that replaces some
 * functionality with mocked versions exposed for testing.
 */

// allow step debugging
const EXTEND_TIMEOUTS = process.env.VSCODE_CLI ? true : false;
import http from "http";
import ioServer from "socket.io";
import { AddressInfo } from "net";

/**
 * Mockarena!
 */
import GmasterConnector from "../src/connectors/gmaster_connector";
jest.mock("../src/connectors/gmaster_connector");
import MockedGMC from "../src/connectors/__mocks__/gmaster_connector";

import { app } from "../src/app";
import { SocketDispatcher } from "../src/SocketDispatcher";
import ClientSockets from "./__ClientSockets";

import { debuglog } from "../src/utils";
import { GhostInSocket } from "./__utils";

export class TestServer {
    // public mocked_gmc: {
    //     post: jest.MockedFunction<MockedGMC["post"]>;
    //     get: jest.MockedFunction<MockedGMC["get"]>;
    // };
    public mocked_gmc: {
        post: jest.MockedFunction<GmasterConnector["post"]>;
        get: jest.MockedFunction<GmasterConnector["get"]>;
    };
    public socs: ClientSockets;
    public openClientSocket: (
        playerName: string,
        token?: string
    ) => GhostInSocket;

    private httpServer: http.Server;
    private socServer: ioServer.Server;

    constructor() {
        // 1. First, we create a running server and mock gmaster connection
        this.httpServer = http.createServer(app).listen();
        // NOTE: potential problem as `httpServer.address()` is said to also
        // return `string` in some cases
        let httpServerAddr = this.httpServer.address() as AddressInfo;
        expect(typeof httpServerAddr).toBe("object");
        debuglog("Server addr is ", httpServerAddr);
        this.socServer = ioServer(this.httpServer, {
            pingTimeout: EXTEND_TIMEOUTS ? 1000000 : 5000
        });

        new SocketDispatcher().attach(this.socServer);
        // `new SocketDispatcher()` above creates an instance of (mocked)
        // GmasterConnector internally, the following line catches it for
        // inspection and manipulation. A bit hacky with the cast, but better
        // than alternatives
        this.mocked_gmc = (GmasterConnector as any).instance;
        expect(this.mocked_gmc).not.toBeNull();

        // 2. Then we configure virtual "client" instances to connect to our
        //    ghost server
        this.socs = new ClientSockets(
            // Travis CI ?
            process.env.TRAVIS
                ? `http://0.0.0.0:${httpServerAddr.port}`
                : `http://[${httpServerAddr.address}]:${httpServerAddr.port}`
        );

        this.openClientSocket = (n, t) => this.socs.openClientSocket(n, t);
    }

    destroy() {
        this.socs && this.socs.cleanUp();
        this.socServer.close();
        this.httpServer.close();
    }
}

export default TestServer;
