# GHost - Game Host

This package insulates game logic from setup and user management (reconnection,
etc.). On one side, it communicates with `client` package to receive players
connections and commands, on the other side it sends game moves to `gmaster`
package for the actual game processing.

Game host supports multiple simultaneous games happening in parallel and can
handle player's reconnection to game in progress.

So, there are three entities which lifetime must be managed:

-   Player id
-   Game room
-   player connection

## Player id

Player id identifies a `client` for purposes of reconnection to a game room in a
case of client-side probles (for example, page refresh F5). Any connection that
doesn't present a Player id (verified by JWT) is assigned a new randomly
generated id.

In abstract, a player id should be the most persistent entity, identify a user
across multiple game sessions and be backed up with some auth process, but
nothing of it is implemented. `Client` code preserves player id to reuse in the
future games, but this is not strictly required.

## Game room

Game room represents a game being played between players. Game room goes
through 2 stages: setup and play.

During setup, players connect and report their choices for the upcoming game.
If one of the players diconnects during setup, another player can take their
place.

Once all players finish setting up, the actual play phase begins. It is at this
point GHost tells GMaster to start a new game session and keeps passing game
moves and game status between GMaster and players. In this phase any of the
players can disconnect and reconnect without losing game progress.

After game is concluded - by win conditions or any of the players forfeiting -
the game room is destroyed.

## Player connection

This is the actual websocket connection between `ghost` and `client`. When a new
connection is opened, ghost reads connection query data and performs one of the
following:

-   if there's a game room in play phase to which this player (by player id)
    belongs, that room's data is updated to use the new connection.

-   if there are no active games this player belongs to, the socket dispatcher
    class waits for "start_game" socket message, and then either create a new
    game room, or assign this connection to an existing game room (that is
    waiting for more players).
