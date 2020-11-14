/**
 * Hook to wrap SocketGameConnector class and wire it up to Recoil state
 */

import { useEffect, useState } from "react";
import { useRecoilValue, useRecoilCallback, useSetRecoilState } from "recoil";
import decode from "jwt-decode";

import {
    playerAuthState,
    roleAssignedState,
    opponentNameState
} from "../state-defs";
import { JWTSession } from "@trulyacerbic/ttt-apis/ghost-api";
import { ClientEventSender } from "../state-machine/state-machine-schema";
import {
    SocketGameConnector,
    SocketGameConnectorSetters
} from "../state-machine/SocketGameConnector";

export const useSocketGameConnector = (
    xstateSend: ClientEventSender,
    setBoard: Function
) => {
    const player = useRecoilValue(playerAuthState);
    const setOpponentName = useSetRecoilState(opponentNameState);
    const setRoleAssigned = useSetRecoilState(roleAssignedState);

    // generate a function that when called would set playerAuthState
    // (to be called from outside of React hooks infrastructure)
    const setAuthToken = useRecoilCallback<[string], void>(
        ({ set }) => token => {
            try {
                const payload = decode(token) as JWTSession;
                set(playerAuthState, oldValue => ({
                    ...oldValue!,
                    token
                }));
            } catch (error) {
                // TODO?
                console.debug(error, token);
                set(playerAuthState, oldValue => ({
                    ...oldValue!,
                    token: null
                }));
            }
        },
        [playerAuthState]
    );

    const setters: SocketGameConnectorSetters = {
        setBoard,
        setAuthToken,
        setOpponentName,
        setRoleAssigned
    };

    // initiate permanent ws connection to the server
    const [
        socConnector,
        setSocConnector
    ] = useState<SocketGameConnector | null>(null);

    useEffect(() => {
        // only create soc connector after player data initialized
        if (player && !socConnector) {
            setSocConnector(
                // the connector will use "send" to self-store into the
                // machine's context and to send websocket events into machine.
                // The machine, in return will use its context value to order
                // actions to the connector
                new SocketGameConnector(xstateSend, player, setters)
            );
        }
    }, [player, socConnector]);

    return socConnector;
};

export default useSocketGameConnector;
