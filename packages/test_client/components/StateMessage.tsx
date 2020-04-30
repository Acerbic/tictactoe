import React from "react";
import { State } from "xstate";
import {
    ClientContext,
    ClientEvent,
    ClientSchema
} from "../state-machine/state-machine-schema";

interface P {
    state: State<ClientContext, ClientEvent, ClientSchema>;
}

export const StateMessage: React.FC<P> = ({ state }) => {
    let sm = "";
    switch (true) {
        case state.matches("initial"):
            sm = "Ready to connect to the game";
            break;
        case state.matches("role_picking"):
            sm = "Choose your destiny!";
            break;
        case state.matches("waiting4opponent"):
            sm = "Waiting for the slowpoke to join...";
            break;
        case state.matches("game.our_turn"):
            sm = "Your turn! Destroy them!";
            break;
        case state.matches("game.their_turn"):
            sm = "Enemy is trying to not lose...";
            break;
        case state.matches("end_draw"):
            sm = "You spared him, how noble.";
            break;
        case state.matches("end_defeat"):
            sm = "... he probably cheated :-\\";
            break;
        case state.matches("end_victory"):
            sm = "As expected, you are the best";
            break;
    }
    return <>{sm}</>;
};

export default StateMessage;
