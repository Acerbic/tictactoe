/**
 * Component for handling username input form, its animations and state.
 * The form itself is handled by the form component UsernameInputForm.
 */

import React, { useEffect, useRef } from "react";
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

    // This allows access to a reactive variable "player" from outside of
    // reactive scope - i.e. from guard functions. Without a ref to wrap player,
    // the guard function's scope would lock onto stale player value.
    const playerRef = useRef(player);
    useEffect(() => {
        playerRef.current = player;
    }, [player]);

    const formComponentRef = useRef<HTMLDivElement>(null);

    // starting machine to track state of the screen
    const [machine, send] = useMachine(Machine(playername_machine), {
        guards: {
            isRequiringInputUsername: () => {
                return !playerRef.current!.nameAccepted;
            }
        },
        actions: {
            saveNewName: (_, event: AggregateEvent) => {
                if (event.type === "SAVE_NEW_NAME") {
                    setPlayer(value => ({
                        ...value!,
                        nameAccepted: true,
                        name: event.newName || "Anonymous"
                    }));
                }
            },
            cancelEdit: () => {
                setPlayer(value => ({ ...value!, nameAccepted: true }));
            }
        }
    });

    // Note: useImperativeHandle?
    sendRef.current = send;

    // global capture of "Escape" key
    useEffect(() => {
        const keyUpHandler = ({ key }: KeyboardEvent) =>
            key === "Escape" && send("CANCEL_EDIT");
        document.addEventListener("keyup", keyUpHandler);
        return () => document.removeEventListener("keyup", keyUpHandler);
    }, []);

    useEffect(() => {
        // only send event after initializer is executed on playerAuthState
        if (typeof player !== "undefined") {
            send("MOUNTED");
        }
    }, [player]);

    const isFormVisible =
        machine.matches("formopen") || machine.matches("formclosing");
    const isFormHoldOpen = machine.matches("formopen");

    return (
        <div ref={formComponentRef}>
            <FadeMinimize
                reset={isFormHoldOpen}
                hold={isFormHoldOpen}
                hidden={!isFormVisible}
            >
                <UsernameInputForm
                    isOpen={isFormHoldOpen}
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
