/**
 * LocalStorage + Recoil.js
 */

import { atom, selector, RecoilState, SetterOrUpdater } from "recoil";
import * as ls from "local-storage";

const recoilStates: Map<string, RecoilState<any>> = new Map();

export interface LSAtomOptions<T> {
    storageKey: string;
    default: T;
}

/**
 * Produces recoil atom-like based on browser's localStorage space value.
 *
 * @returns a pair [RecoilState, initializer function]. The initializer should
 * be called (once) on startup to load initial value from localStorage and
 * handle changes made to local storage from other tabs.
 */
export function atomLocalStorage<T>(
    opts: LSAtomOptions<T>
): [
    RecoilState<T | undefined>,
    (setter: SetterOrUpdater<T | undefined>) => void
] {
    const key = `atom-ls-recoiled-${opts.storageKey}`;
    // undefined is value of the state before initializer is run (to be
    // consistent with SSR)
    let rs: RecoilState<T | undefined>;

    if (recoilStates.has(key)) {
        rs = recoilStates.get(key)!;
    } else {
        // backstorage to facilitate Recoil observable pattern
        let a = atom<T | undefined>({
            key,
            // reading value from localStorage here would issue a SSR hydration
            // warning (inconsistency with server rendering)
            default: undefined
        });

        // selector to augment setting atom with setting to local storage
        rs = selector<T | undefined>({
            key: `selector-ls-recoiled-${opts.storageKey}`,
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

    // initialized loads stored value from local storage and subscribes to
    // changes must be called with an appropriate setter (from a React component
    // code hook useRecoilState)
    const initializer = (setValue: SetterOrUpdater<T | undefined>) => {
        setValue(ls.get<T>(opts.storageKey) || opts.default);

        // subscribe to updates from other tabs
        ls.on(opts.storageKey, (v: any) => {
            setValue(v);
        });
    };

    // now this is a bit hacky. before initializer is executed, rs is
    // RecoilState<undefined> - i.e. always returns undefined value, after
    // initializer its either defaults or value read from local storage
    return [rs, initializer];
}
