CREATE TABLE "business" (
	"business_id" serial PRIMARY KEY NOT NULL,
	"business_uuid" text NOT NULL,
	"business_public_uuid" text NOT NULL,
	"name" text NOT NULL,
	"logo_url" text,
	CONSTRAINT "business_business_uuid_unique" UNIQUE("business_uuid"),
	CONSTRAINT "business_business_public_uuid_unique" UNIQUE("business_public_uuid")
);
--> statement-breakpoint
CREATE TABLE "comment" (
	"comment_id" serial PRIMARY KEY NOT NULL,
	"comment_uuid" text NOT NULL,
	"portfolio_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "comment_comment_uuid_unique" UNIQUE("comment_uuid")
);
--> statement-breakpoint
CREATE TABLE "portfolio" (
	"portfolio_id" serial PRIMARY KEY NOT NULL,
	"portfolio_uuid" text NOT NULL,
	"portfolio_public_uuid" text NOT NULL,
	"business_id" integer NOT NULL,
	"title" text NOT NULL,
	"visibility" text NOT NULL,
	CONSTRAINT "portfolio_portfolio_uuid_unique" UNIQUE("portfolio_uuid"),
	CONSTRAINT "portfolio_portfolio_public_uuid_unique" UNIQUE("portfolio_public_uuid")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"session_id" serial PRIMARY KEY NOT NULL,
	"session_token" text NOT NULL,
	"user_id" integer NOT NULL,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "session_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"user_id" serial PRIMARY KEY NOT NULL,
	"user_uuid" text NOT NULL,
	"user_public_uuid" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	CONSTRAINT "user_user_uuid_unique" UNIQUE("user_uuid"),
	CONSTRAINT "user_user_public_uuid_unique" UNIQUE("user_public_uuid"),
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "user_business" (
	"user_business_id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"business_id" integer NOT NULL,
	"role" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "comment" ADD CONSTRAINT "comment_portfolio_id_portfolio_portfolio_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolio"("portfolio_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment" ADD CONSTRAINT "comment_user_id_user_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio" ADD CONSTRAINT "portfolio_business_id_business_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("business_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_business" ADD CONSTRAINT "user_business_user_id_user_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_business" ADD CONSTRAINT "user_business_business_id_business_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("business_id") ON DELETE no action ON UPDATE no action;