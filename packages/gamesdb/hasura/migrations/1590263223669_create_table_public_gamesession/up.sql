CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE "public"."gamesession"("id" uuid NOT NULL DEFAULT gen_random_uuid(), "player1" text NOT NULL, "player2" text NOT NULL, "state" text NOT NULL, "board" text NOT NULL, PRIMARY KEY ("id") );
