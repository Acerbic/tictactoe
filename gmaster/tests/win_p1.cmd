curl -X POST -H "Content-Type: application/json" localhost:3000/MakeMove/1 -d {\"playerId\":\"111\",\"move\":{\"row\":\"1\",\"column\":\"2\"}}
curl -X POST -H "Content-Type: application/json" localhost:3000/MakeMove/1 -d {\"playerId\":\"222\",\"move\":{\"row\":\"2\",\"column\":\"2\"}}
curl -X POST -H "Content-Type: application/json" localhost:3000/MakeMove/1 -d {\"playerId\":\"111\",\"move\":{\"row\":\"1\",\"column\":\"0\"}}
curl -X POST -H "Content-Type: application/json" localhost:3000/MakeMove/1 -d {\"playerId\":\"222\",\"move\":{\"row\":\"0\",\"column\":\"2\"}}
curl -X POST -H "Content-Type: application/json" localhost:3000/MakeMove/1 -d {\"playerId\":\"111\",\"move\":{\"row\":\"1\",\"column\":\"1\"}}