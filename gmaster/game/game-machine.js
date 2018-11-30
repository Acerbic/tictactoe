const xstate = require('xstate');

const States = [ "wait_p1", "wait_p2", "p1_won", "p2_won", "draw" ];

const GameMachine = xstate.Machine({
  id: "tictactoe",
  initial: "wait_p1",
  states: {
    wait_p1: {
      on: { P1_MOVE: "wait_p2" },
      on: { P1_MOVE_W: "p1_won" },
      on: { LAST_MOVE: "draw" },
    },
    wait_p2: {
      on: { P2_MOVE: "wait_p1" },
      on: { P2_MOVE_W: "p2_won" },
    },
    p1_won: {
      type: "final"
    },
    p2_won: {
      type: "final"
    },
    draw: {
      type: "final"
    }
  }
})

module.exports = { States, GameMachine };