-- CreateTable
CREATE TABLE "public"."shared_bundle" (
    "shared_bundle_id" TEXT NOT NULL,
    "owner_user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shared_bundle_pkey" PRIMARY KEY ("shared_bundle_id")
);

-- CreateTable
CREATE TABLE "public"."shared_bundle_episode" (
    "shared_bundle_id" TEXT NOT NULL,
    "episode_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shared_bundle_episode_pkey" PRIMARY KEY ("shared_bundle_id","episode_id")
);

-- CreateIndex
CREATE INDEX "shared_bundle_owner_user_id_idx" ON "public"."shared_bundle"("owner_user_id");

-- CreateIndex
CREATE INDEX "shared_bundle_is_active_idx" ON "public"."shared_bundle"("is_active");

-- CreateIndex
CREATE INDEX "shared_bundle_episode_shared_bundle_id_idx" ON "public"."shared_bundle_episode"("shared_bundle_id");

-- CreateIndex
CREATE INDEX "shared_bundle_episode_episode_id_idx" ON "public"."shared_bundle_episode"("episode_id");

-- AddForeignKey
ALTER TABLE "public"."shared_bundle" ADD CONSTRAINT "shared_bundle_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shared_bundle_episode" ADD CONSTRAINT "shared_bundle_episode_shared_bundle_id_fkey" FOREIGN KEY ("shared_bundle_id") REFERENCES "public"."shared_bundle"("shared_bundle_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shared_bundle_episode" ADD CONSTRAINT "shared_bundle_episode_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "public"."user_episode"("episode_id") ON DELETE CASCADE ON UPDATE CASCADE;
