/**
 * Higher-order component extracting user logic from the presentational side.
 * There's no particular reason for HOC pattern, I just wanted to use it for
 * something.
 */

import React, { useEffect, useState } from "react";
import { useRecoilState, useRecoilCallback } from "recoil";
import { Machine } from "xstate";
import { useMachine } from "@xstate/react";
import { useSpring, animated } from "react-spring";

import { playerAuthState } from "../state-defs";
import { UserBar } from "./UserBar";
import { UsernameInputForm } from "./UsernameInputForm";
import {
    playername_machine,
    AggregateEvent
} from "../state-machine/playername-machine-schema";

export const UI: React.FC = () => {
    const [player, setPlayer] = useRecoilState(playerAuthState);

    // callback to read THE LATEST value of Recoil state atom, even when not in
    // Reactive environment (in the xstate machine guard). Alternatively, it is
    // possible to give the xstate machine access to the latest values by
    // directly informing it of updates - via events or by updating context.
    const readPlayerName = useRecoilCallback<[], string>(
        ({ snapshot }) => () =>
            (snapshot.getLoadable(playerAuthState).contents as any).name,
        []
    );

    const [machine, send] = useMachine(Machine(playername_machine), {
        guards: {
            isRequiringInputUsername: () => {
                const playerName = readPlayerName();
                return !playerName || playerName === "Anonymous";
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
            }
        }
    });

    const [resetAnimation, setResetAnimantion] = useState(false);
    const onPlayerNameClick = () => {
        send("EDIT_NAME");
        setResetAnimantion(true);
    };

    const isFormClosing = machine.matches("formclosing");
    const isFormVisible = machine.matches("formopen") || isFormClosing;
    const { transform, opacity } = useSpring({
        transform: isFormClosing
            ? "translate(50%, -50%) scale(0.35)"
            : "translate(0%, 0%) scale(1)",
        opacity: isFormClosing ? 0 : 1,
        from: {
            transform: "translate(0%, 0%) scale(1)",
            opacity: 1
        },
        reset: resetAnimation,
        onStart: () => setResetAnimantion(false)
    });

    return (
        <>
            <UserBar
                onPlayerNameClick={onPlayerNameClick}
                playerName={player.name}
            ></UserBar>
            {isFormVisible && (
                <animated.div
                    className="fixed left-0 top-0 h-full w-full"
                    style={{
                        transform,
                        opacity,
                        zIndex: 10,
                        pointerEvents: isFormClosing ? "none" : "unset"
                    }}
                >
                    <UsernameInputForm
                        initialValue={player.name}
                        isFormClosing={isFormClosing}
                        onCancelClick={() => send("CANCEL_EDIT")}
                        onSaveClick={newName =>
                            send({ type: "SAVE_NEW_NAME", newName })
                        }
                    />
                </animated.div>
            )}
        </>
    );
};

export default UI;
