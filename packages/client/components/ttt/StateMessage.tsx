/**
 * Text element to represent current game's state
 */

import React from "react";
import { State } from "xstate";
import {
    ClientContext,
    ClientEvent,
    ClientSchema
} from "../../state-machine/state-machine-schema";

interface P {
    state: State<ClientContext, ClientEvent, ClientSchema>;
}

export const StateMessage: React.FC<P> = ({ state }) => {
    let sm = "";
    switch (true) {
        case state.matches("initial"):
            sm = "Waiting for server response...";
            break;
        case state.matches("lobby"):
            sm = "Ready to connect to or create a new game";
            break;
        case state.matches("role_picking"):
            sm = "Choose your destiny!";
            break;
        case state.matches("waiting4opponent"):
            sm = "Waiting for the opponent to join...";
            break;
        case state.matches("game.reconnecting"):
            sm = "... reconnecting ...";
            break;
        case state.matches("game.our_turn"):
            sm = "Your turn! Destroy them!";
            break;
        case state.matches("game.their_turn"):
            sm = "Enemy is trying not to lose...";
            break;
        case state.matches("end.draw"):
            sm = "You spared him, how noble.";
            break;
        case state.matches("end.defeat"):
            sm = "... he probably cheated :-\\";
            break;
        case state.matches("end.victory"):
            sm = "As expected, you are the best";
            break;
    }
    return <>{sm}</>;
};

export default StateMessage;
