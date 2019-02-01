import * as xstate from 'xstate';

export interface GameContext extends xstate.DefaultContext {
  board: Array<Array<any>>;
  moves_made: number;
  last_move: any;
};

export const GameMachine = xstate.Machine({
  id: "tictactoe",
  context: {
    // game board (3x3 table)
    board: Array(Array(3), Array(3), Array(3)),
    // number of moves made so far
    moves_made: 0,
    // stores the move made by a player, 
    // since each move creates 2 transitions, it helps to know what caused 
    // it on the derived transitions
    last_move: null
  } as GameContext,
  type: "parallel",
  states: {
    /* since game is symmetrical for players (same rules), we just track
       who's turn it is in as separate machine */
    turn: {
      initial: "player1",
      states: {
        player1: { on: { NEXTMOVE: "player2" } },
        player2: { on: { NEXTMOVE: "player1" } }
      }
    },
  
    /* Actual internal logic of the game */
    game: {
      initial: "wait",
      states: {

        wait: { on: {
          MOVE: {
            target: "thinking",
            actions: [
              /* change the board */
              'applyMove',
              /* and think of what happened */
              xstate.actions.raise("KOVALSKY")
            ]
          } }
        },

        thinking: { on: { 
          KOVALSKY: [
            { target: "over", cond: condGameOver },
            { target: "draw", cond: condDraw },
            { target: "wait", actions: xstate.actions.raise("NEXTMOVE") }
          ] 
        } },
        draw: { type: "final" },
        over: { type: "final" }
      },
    }
  }
}, {
  actions: {
    applyMove: xstate.actions.assign({
      board: (ctx : GameContext, event : any) => {
        // not sure, should I make a copy of the board object?
        ctx.board[event.move.row][event.move.column] = event.playerId;
        return ctx.board;
      },
      moves_made: (ctx : GameContext) => ctx.moves_made + 1,
      last_move: (ctx : GameContext, event : any) => event
    })
  }
});

/**
 * Conditional guard - checks if after this move the player won and game is over
 * @param {*} ctx 
 * @param {*} event 
 */
function condGameOver( {board, moves_made, last_move} : GameContext ) {
  const move = last_move.move;
  const currentPlayerTag = board[move.row][move.column];
  if (!currentPlayerTag) {
    throw new Error("bad player's tag on board during guard check: " + String(currentPlayerTag));
  }

  // check row
  if (currentPlayerTag == board[move.row][0] &&
      currentPlayerTag == board[move.row][1] &&
      currentPlayerTag == board[move.row][2]) {
    return true;
  }
  // check column
  if (currentPlayerTag == board[0][move.column] &&
      currentPlayerTag == board[1][move.column] &&
      currentPlayerTag == board[2][move.column]) {
    return true;
  }
  // main diagonal
  if ((move.row == move.column) && 
      board[0][0] == board[1][1] &&
      board[1][1] == board[2][2]) {
    return true;
  }
  // second diagonal
  if ((move.row == 2 - move.column) &&
      board[0][2] == board[1][1] &&
      board[1][1] == board[2][0]) {
    return true;
  }

  return false;
}

/**
 * Conditional transition guard.
 * Checks if the game ended in draw and there's no move moves to make.
 * @param {*} ctx 
 * @param {*} event 
 */
function condDraw(ctx : GameContext) {
  return ctx.moves_made == 9;
}

// module.exports = GameMachine;