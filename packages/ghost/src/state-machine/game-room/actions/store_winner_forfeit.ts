import { GameState } from "@trulyacerbic/ttt-apis/gmaster-api";
import { assign } from "xstate/lib/actions";
import { actionlog } from ".";

import { PlayerDisconnectTimeout } from "../../players-pool/players-pool-machine";
import { GameRoomContext, GameRoom_PlayerQuit } from "../game-room-schema";

export const store_winner_forfeit = assign<
    GameRoomContext,
    PlayerDisconnectTimeout | GameRoom_PlayerQuit
>({
    game_state: ({ player1, game_state }, { player_id }) => {
        actionlog("store_winner_forfeit");

        return Object.assign({}, game_state, <GameState>{
            game: "over",
            turn: player1 === player_id ? "player1" : "player2"
        });
    }
});
