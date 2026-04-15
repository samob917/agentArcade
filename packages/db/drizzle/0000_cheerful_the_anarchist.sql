CREATE TYPE "public"."bet_status" AS ENUM('pending', 'active', 'won', 'lost', 'cancelled', 'settled');--> statement-breakpoint
CREATE TYPE "public"."match_status" AS ENUM('waiting', 'in_progress', 'completed', 'cancelled', 'abandoned');--> statement-breakpoint
CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"description" text,
	"api_key_hash" varchar(255) NOT NULL,
	"api_key_prefix" varchar(12) NOT NULL,
	"callback_url" text,
	"llm_provider" varchar(50),
	"supported_games" jsonb NOT NULL,
	"elo" integer DEFAULT 1200 NOT NULL,
	"is_built_in" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"total_matches" integer DEFAULT 0 NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	"draws" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agents_slug_unique" UNIQUE("slug"),
	CONSTRAINT "agents_api_key_hash_unique" UNIQUE("api_key_hash")
);
--> statement-breakpoint
CREATE TABLE "bets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"backed_player_id" uuid NOT NULL,
	"amount_wei" numeric(78) NOT NULL,
	"odds" numeric(10, 4) NOT NULL,
	"potential_payout_wei" numeric(78) NOT NULL,
	"status" "bet_status" DEFAULT 'pending' NOT NULL,
	"tx_hash" varchar(66),
	"settlement_tx_hash" varchar(66),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"settled_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "games" (
	"slug" varchar(50) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"min_players" integer NOT NULL,
	"max_players" integer NOT NULL,
	"turn_based" boolean DEFAULT true NOT NULL,
	"default_time_control" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"user_id" uuid,
	"agent_id" uuid,
	"seat" integer NOT NULL,
	"is_human" boolean NOT NULL,
	"time_remaining_ms" integer
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_slug" varchar(50) NOT NULL,
	"status" "match_status" DEFAULT 'waiting' NOT NULL,
	"config" jsonb,
	"state" jsonb,
	"result" jsonb,
	"current_turn_player_id" uuid,
	"turn_number" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moves" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"turn_number" integer NOT NULL,
	"move_data" jsonb NOT NULL,
	"resulting_state" jsonb,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(100) NOT NULL,
	"password_hash" varchar(255),
	"avatar_url" text,
	"wallet_address" varchar(42),
	"elo" integer DEFAULT 1200 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bets" ADD CONSTRAINT "bets_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bets" ADD CONSTRAINT "bets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_players" ADD CONSTRAINT "match_players_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_players" ADD CONSTRAINT "match_players_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_players" ADD CONSTRAINT "match_players_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_game_slug_games_slug_fk" FOREIGN KEY ("game_slug") REFERENCES "public"."games"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moves" ADD CONSTRAINT "moves_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bet_match_idx" ON "bets" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "bet_user_idx" ON "bets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "mp_match_idx" ON "match_players" USING btree ("match_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mp_unique_seat" ON "match_players" USING btree ("match_id","seat");--> statement-breakpoint
CREATE INDEX "match_status_idx" ON "matches" USING btree ("status");--> statement-breakpoint
CREATE INDEX "match_game_idx" ON "matches" USING btree ("game_slug");--> statement-breakpoint
CREATE INDEX "move_match_turn_idx" ON "moves" USING btree ("match_id","turn_number");