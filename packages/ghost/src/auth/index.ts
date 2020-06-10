/**
 * Authentication tokens allows reconnecting to a game in progress, for example
 */

import { sign, verify } from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

import { JWTSession, API } from "@trulyacerbic/ttt-apis/ghost-api";

export const JWT_SECRET = process.env.JWT_SECRET!;

/**
 * check token integrity
 * @param token JWT
 */
export const validate = (token: string): boolean => {
    try {
        verify(token, JWT_SECRET);
        return true;
    } catch (e) {
        return false;
    }
};

export const regenerate = (
    connQuery: API["connection"]
): { playerId: string; playerName: string; token: string } => {
    // default: new id with name "Anonymous"
    let payload: JWTSession = { playerId: uuidv4(), playerName: "Anonymous" };

    try {
        if (connQuery.token) {
            payload = verify(connQuery.token, JWT_SECRET) as JWTSession;
        }
    } catch (e) {}

    if (connQuery.playerName) {
        payload.playerName = connQuery.playerName;
    }

    return {
        ...payload,
        token: sign(payload, JWT_SECRET)
    };
};
