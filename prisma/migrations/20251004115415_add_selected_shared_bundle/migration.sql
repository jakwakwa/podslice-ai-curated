-- AlterTable
ALTER TABLE "public"."user_curation_profile" ADD COLUMN     "selected_shared_bundle_id" TEXT;

-- AddForeignKey
ALTER TABLE "public"."user_curation_profile" ADD CONSTRAINT "user_curation_profile_selected_shared_bundle_id_fkey" FOREIGN KEY ("selected_shared_bundle_id") REFERENCES "public"."shared_bundle"("shared_bundle_id") ON DELETE SET NULL ON UPDATE CASCADE;
