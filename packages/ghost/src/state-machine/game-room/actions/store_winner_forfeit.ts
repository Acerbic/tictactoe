import { assign } from "xstate/lib/actions";

import { PlayerDisconnectTimeout } from "../../players-pool/players-pool-machine";
import { GameRoomContext, GameRoom_PlayerQuit } from "../game-room-schema";

export const store_winner_forfeit = assign<
    GameRoomContext,
    PlayerDisconnectTimeout | GameRoom_PlayerQuit
>({
    game_winner: ({ player1, player2 }, { player_id }) =>
        player_id === player1 ? player2! : player1!
});
