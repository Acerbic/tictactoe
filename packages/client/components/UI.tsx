/**
 * Higher-order component extracting user logic from the presentational side.
 * There's no particular reason for HOC pattern, I just wanted to use it for
 * something.
 */

import React, { useEffect, useState } from "react";
import { useRecoilState } from "recoil";
import { Machine } from "xstate";
import { useMachine } from "@xstate/react";

import { playerAuthState } from "../state-defs";
import { UserBar } from "./UserBar";
import { UsernameInputForm } from "./UsernameInputForm";
import {
    playername_machine,
    AggregateEvent
} from "../state-machine/playername-machine-schema";

export const UI: React.FC = () => {
    const [player, setPlayer] = useRecoilState(playerAuthState);
    const [machine, send] = useMachine(Machine(playername_machine), {
        guards: {
            isRequiringInputUsername: () =>
                !player.name || player.name === "Anonymous"
        },
        actions: {
            saveNewName: (_, event: AggregateEvent) => {
                if (event.type === "SAVE_NEW_NAME") {
                    setPlayer(value => ({
                        ...value,
                        name: event.newName || "Anonymous"
                    }));
                }
            }
        }
    });

    const onPlayerNameClick = () => {
        send("EDIT_NAME");
    };

    return (
        <>
            <UserBar
                onPlayerNameClick={onPlayerNameClick}
                playerName={player.name || "Anonymous"}
            ></UserBar>
            {machine.value}
            {/* Upon mounting, the form reads initial value for the input
                field. When form closes, it unmounts. */}
            {machine.matches("formclosed") || (
                <div
                    className="fixed left-0 top-0 h-full w-full border-gray-600 border-8"
                    style={{ zIndex: 10 }}
                >
                    <UsernameInputForm
                        onCancelClick={() => send("CANCEL_EDIT")}
                        onSaveClick={newName =>
                            send({ type: "SAVE_NEW_NAME", newName })
                        }
                    />
                </div>
            )}
        </>
    );
};

export default UI;
