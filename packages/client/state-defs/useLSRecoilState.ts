/**
 * LocalStorage + Recoil.js
 */

import { useEffect } from "react";
import {
    atom,
    selector,
    RecoilState,
    useRecoilState,
    useSetRecoilState,
    NodeKey,
    SetterOrUpdater
} from "recoil";
import * as ls from "local-storage";

const recoilStates: Map<NodeKey, RecoilState<any>> = new Map();

export interface LSAtomOptions<T> {
    storageKey: string;
    default: T;
}

// TODO: Experiment and see if useRecoilCallback or preserving {set} could be
// used to simplify initializer() function

/**
 * Produces recoil atom-like based on browser's localStorage space value.
 *
 * @returns a pair [RecoilState, initializer function]. The initializer should
 * be called (once) on startup to load initial value from localStorage and
 * handle changes made to local storage from other tabs.
 */
export function atomLocalStorage<T>(
    opts: LSAtomOptions<T>
): [RecoilState<T>, (setter: SetterOrUpdater<T>, defaultValue: T) => void] {
    const key = `ls-recoiled-${opts.storageKey}`;
    let a: RecoilState<T>;
    let rs: RecoilState<T>;
    if (recoilStates.has(key)) {
        rs = recoilStates.get(key)!;
    } else {
        // backstorage to facilitate Recoil observable pattern
        a = atom<T>({
            key: `atom-${key}`,
            // reading value from localStorage here would issue a SSR hydration warning
            // (inconsistency with server rendering)
            default: opts.default
        });

        // selector to augment setting atom with setting to local storage
        rs = selector<T>({
            key,
            get: ({ get }) => get(a),
            set: ({ get, set }, newValue) => {
                if (get(a) !== newValue) {
                    set(a, newValue);
                    ls.set(opts.storageKey, newValue);
                }
            }
        });

        // keep track of generated selectors
        recoilStates.set(key, rs);
    }

    const initializer = (setValue: SetterOrUpdater<T>, defaultValue: T) => {
        setValue(ls.get<T>(opts.storageKey) || opts.default || defaultValue);

        // subscribe to updates from other tabs
        ls.on(opts.storageKey, (v: any) => {
            setValue(v);
        });
    };

    return [rs, initializer];
}

/**
 * React hook wrapper around generated atom.
 */
export function useLSRecoilState<T>(
    storageKey: string,
    defaultValue: T
): [T, SetterOrUpdater<T>] {
    const [lsState, init] = atomLocalStorage<T | null>({
        storageKey,
        default: null
    });

    const setV = useSetRecoilState(lsState);
    useEffect(() => {
        init(setV, defaultValue);
    }, []);
    return useRecoilState<T>(lsState as RecoilState<T>);
}
