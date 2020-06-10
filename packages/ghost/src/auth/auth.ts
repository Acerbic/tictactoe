/**
 * Authentication tokens allows reconnecting to a game in progress, for example
 */

import { decode, sign, verify } from "jsonwebtoken";

import { JWTSession } from "@trulyacerbic/ttt-apis/ghost-api";

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
export const generate = (playerName: string, playerId: string): string => {
    const payloard: JWTSession = {
        playerId,
        playerName
    };

    return sign(payloard, JWT_SECRET);
};
export const regenerate = (token: string, name?: string): string => {
    const payloard: JWTSession = decode(token) as JWTSession;
    if (name) {
        payloard.playerName = name;
    }
    return sign(payloard, JWT_SECRET);
};
