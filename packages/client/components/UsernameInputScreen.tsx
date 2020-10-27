/**
 * Component for handling username input form, its animations and state.
 * The form itself is handled by the form component UsernameInputForm.
 */

import React, { useEffect, useRef, useState } from "react";
import { useRecoilState } from "recoil";
import { Machine, Sender } from "xstate";
import { useMachine } from "@xstate/react";

import { playerAuthState } from "../state-defs";
import { UsernameInputForm } from "./UsernameInputForm";
import {
    playername_machine,
    AggregateEvent
} from "../state-machine/playername-machine-schema";
import { FadeMinimize } from "./react-spring/FadeMinimize";

interface P {
    // exposing "send" function via a ref
    sendRef: React.MutableRefObject<Sender<AggregateEvent> | null>;
}

export const UsernameInputScreen: React.FC<P> = ({ sendRef }) => {
    const [player, setPlayer] = useRecoilState(playerAuthState);

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
    sendRef.current = send;

    useEffect(() => {
        send("MOUNTED");
    }, []);

    const isFormClosing = machine.matches("formclosing");
    const isFormVisible =
        machine.matches("formopen") || machine.matches("formclosing");
    const isFormHoldOpen = machine.matches("formopen");

    return (
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
    );
};

export default UsernameInputScreen;
