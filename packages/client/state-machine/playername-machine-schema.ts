/**
 * State machine to control input of a player's name.
 *
 * The actual input is done with local state of a controlled input field with
 * React. The machine controls switch between showing and hiding input form.
 *
 * The state machine would interact with the application with listening to event
 * explicitly passed to it and an implementation of a conditional guard, and
 * respond with actions, that are also provided to it from outside. As such, the
 * machine represents a translation "events+guard => actions calls" - i.e. a
 * fragment of app logic. Being used to control a React component and using
 * RecoilJS state, the machine should be initialized from inside a valid React
 * Component and is subordinate to it.
 */

import { StateSchema, EventObject, MachineConfig } from "xstate";

export interface PlayernameContext {}

export interface PlayernameSchema extends StateSchema<PlayernameContext> {
    states: {
        initial: {};
        formopen: {};
        formclosing: {};
        formclosed: {};
    };
}

export interface EditName extends EventObject {
    type: "EDIT_NAME";
}

export interface SaveNewName extends EventObject {
    type: "SAVE_NEW_NAME";
    newName: string;
}

export interface CancelEdit extends EventObject {
    type: "CANCEL_EDIT";
}

export interface ForceClose extends EventObject {
    type: "FORCE_CLOSE";
}

export type AggregateEvent = EditName | SaveNewName | CancelEdit | ForceClose;

export const playername_machine: MachineConfig<
    PlayernameContext,
    PlayernameSchema,
    AggregateEvent
> = {
    id: "playername",
    initial: "initial",
    states: {
        initial: {
            /* Using `after:0` instead of `always` because we need to wait for
            local storage state to be properly read on component mount to
            evaluate the condition guard */
            after: {
                0: [
                    { cond: "isRequiringInputUsername", target: "formopen" },
                    { target: "formclosed" }
                ]
            }
        },
        formopen: {
            on: {
                SAVE_NEW_NAME: {
                    target: "formclosing",
                    actions: "saveNewName"
                },
                CANCEL_EDIT: { target: "formclosing" }
            }
        },
        formclosing: {
            after: {
                1000: "formclosed"
            },
            on: {
                FORCE_CLOSE: { target: "formclosed" },
                EDIT_NAME: { target: "formopen" }
            }
        },
        formclosed: {
            on: {
                EDIT_NAME: { target: "formopen" }
            }
        }
    }
};
