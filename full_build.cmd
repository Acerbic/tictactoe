
cd gamesdb
CALL npm version patch
CALL npm publish --access public
CALL docker build -t deployer .

cd ../gmaster
CALL docker build -t gmaster .

cd ../ghost
CALL docker build -t ghost .

cd ..
CALL docker-compose up -d