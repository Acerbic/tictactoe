
cd gamesdb
CALL npm version patch
CALL npm publish --access public

CALL docker-compose build