const { Interpreter } = require('xstate/lib/interpreter');

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
                this.send(action_result);
            }
        } else {
            super.exec(action, context, event);
        }
    }
}