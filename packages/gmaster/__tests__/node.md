Prior to running tests make sure the database storage is available and ready.
Tests will fail if run immediately after deploying Docker containers, because
the database container takes some time (up to a minute!) to initialize itself,
and after that docker-deployer container will take additional time to set up
a propor database structures for the project.

See "wait-for-it.sh" script in '@trulyacerbic/ttt-gamesdb' package.
