CREATE TYPE "public"."conversation_status" AS ENUM('active', 'closed', 'needs_human');--> statement-breakpoint
CREATE TYPE "public"."message_direction" AS ENUM('incoming', 'outgoing');--> statement-breakpoint
CREATE TYPE "public"."reservation_status" AS ENUM('pending', 'confirmed', 'cancelled', 'modified');--> statement-breakpoint
CREATE TABLE "agent_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer,
	"tool_called" text,
	"tool_input" text,
	"tool_output" text,
	"tokens_used" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"status" "conversation_status" DEFAULT 'active' NOT NULL,
	"agent_enabled" boolean DEFAULT true NOT NULL,
	"message_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_message_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"instagram_user_id" text NOT NULL,
	"username" text,
	"full_name" text,
	"profile_pic_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_contact_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customers_instagram_user_id_unique" UNIQUE("instagram_user_id")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"direction" "message_direction" NOT NULL,
	"content" text NOT NULL,
	"instagram_message_id" text,
	"sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer,
	"customer_name" text NOT NULL,
	"phone" text NOT NULL,
	"date" text NOT NULL,
	"time" text NOT NULL,
	"guests" integer NOT NULL,
	"occasion" text,
	"notes" text,
	"status" "reservation_status" DEFAULT 'confirmed' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_logs" ADD CONSTRAINT "agent_logs_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;