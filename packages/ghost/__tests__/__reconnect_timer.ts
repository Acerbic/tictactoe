/**
 * Mock reconnect_timer Callback Actor to use Jest fake timers cannot use fake
 * timers on test level, because Socket.IO gets confused (test doesn't exit in
 * time)
 */

const { reconnect_timer: original_rt } = jest.requireActual(
    "../src/state-machine/game-room/actors/reconnect_timer"
);

export const reconnect_timer = (player_id: string, time: number) => {
    const generatedCallbackActor = original_rt(player_id, time);
    return (cb: Function, onR: Function) => {
        const fakeOnR = (handler: Function) =>
            onR((e: any) => {
                jest.useFakeTimers();
                handler(e);
                jest.useRealTimers();
            });
        jest.useFakeTimers();
        const actorCallResult = generatedCallbackActor(cb, fakeOnR);
        jest.useRealTimers();
        return actorCallResult;
    };
};
