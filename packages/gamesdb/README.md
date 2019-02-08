# WHAT!? #

This is a database definition module based on Prisma.
The purpose of this package is twofold:

1. When built into a docker image and that image is started, it will connect
   to the database and update Prisma database shape to a new definition.
2. When installed as a Node dependency, it will generate a JS client library
   to be used to connect to the Prisma database, aware of the database
   definitions. (Also provides .d.ts declarations for TS)
