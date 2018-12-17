const { Interpreter } = require('xstate/lib/interpreter');

/**
 * Extension to the default interpreter that allows functional actions to
 * raise events on the state machine by returning value from the action function.
 * If the action function returns a Promise, the value with which that promise will
 * eventually resolve is send as an event. If action function returns other 'non-falsy'
 * value (e.g. an object or a string), that value is immediately send as an event.
 */
module.exports = class ActionableInterpreter extends Interpreter {
    exec (action, context, event) {
        if (action.exec) {
            const action_result = action.exec(context, event, { action: action });
            if (!action_result) { return; }
            if (action_result instanceof Promise) {
                action_result.then( promise_result => {
                    if (promise_result) {
                        this.send(promise_result);
                    }
                } );
            }
            else {
                this.eventQueue.push(action_result);
            }
        } else {
            super.exec(action, context, event);
        }
    }
}