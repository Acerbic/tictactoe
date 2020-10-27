/**
 * Higher-order component extracting user logic from the presentational side.
 * There's no particular reason for HOC pattern, I just wanted to use it for
 * something.
 */

import React, { useEffect, useRef, useState } from "react";
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
import { FadeMinimize } from "./react-spring/FadeMinimize";

export const UI: React.FC = () => {
    // awkwardly disabling server-side rendering, bc playerAuthState
    // is loaded from local storage and will not match during hydration.
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    const formComponentRef = useRef<HTMLDivElement>(null);
    const [formJustOpened, setFormJustOpened] = useState(false);

    // catching transition signal into Open form
    useEffect(() => {
        if (formJustOpened) {
            setFormJustOpened(false);
            (formComponentRef.current?.querySelector(
                'input[type="text"]'
            ) as HTMLInputElement)?.focus();
        }
    }, [formJustOpened]);

    const [player, setPlayer] = useRecoilState(playerAuthState);

    const [machine, send] = useMachine(Machine(playername_machine), {
        guards: {
            isRequiringInputUsername: () => {
                return player.name === null;
            }
        },
        actions: {
            saveNewName: (_, event: AggregateEvent) => {
                if (event.type === "SAVE_NEW_NAME") {
                    setPlayer(value => ({
                        ...value,
                        name: event.newName || "Anonymous"
                    }));
                }
            },
            setFormJustOpened: () => setFormJustOpened(true)
        }
    });

    const isFormClosing = machine.matches("formclosing");
    const isFormVisible =
        machine.matches("formopen") || machine.matches("formclosing");
    const isFormHoldOpen = machine.matches("formopen");

    return (
        (mounted && (
            <>
                <UserBar
                    onPlayerNameClick={() => send("EDIT_NAME")}
                    playerName={player.name || "Anonymous"}
                ></UserBar>

                <div ref={formComponentRef}>
                    <FadeMinimize
                        reset={formJustOpened}
                        hold={isFormHoldOpen}
                        hidden={!isFormVisible}
                    >
                        <UsernameInputForm
                            initialValue={player.name || "Anonymous"}
                            isFormClosing={isFormClosing}
                            onCancelClick={() => send("CANCEL_EDIT")}
                            onSaveClick={newName =>
                                send({ type: "SAVE_NEW_NAME", newName })
                            }
                        />
                    </FadeMinimize>
                </div>
            </>
        )) || <></>
    );
};

export default UI;
