import { NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/trainerize/photos/baseline
 *
 * Set or clear the baseline photo for a specific pose.
 *
 * Body: {
 *   clientId: string,
 *   pose: string,
 *   photoId: string | null,     // null to clear baseline
 *   photoUrl: string | null,
 *   photoTakenAt: string | null
 * }
 *
 * Returns the updated pose comparison.
 */
export async function PATCH(request: Request) {
  try {
    const supabase = createClient();

    // 1. Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();
    const { clientId, pose, photoId, photoUrl, photoTakenAt } = body;

    if (!clientId || !pose) {
      return NextResponse.json(
        { error: "Missing required fields: clientId, pose" },
        { status: 400 }
      );
    }

    // 3. Verify client ownership
    const { data: clientRow, error: clientError } = await supabase
      .from("clients")
      .select("id, trainerize_id")
      .eq("id", clientId)
      .eq("trainer_id", user.id)
      .single();

    if (clientError || !clientRow) {
      return NextResponse.json(
        { error: "Client not found or access denied" },
        { status: 404 }
      );
    }

    const normalizedPose = (pose || "unknown").toLowerCase();

    // 4. Check if a row exists for this pose
    const { data: existingRow } = await supabase
      .from("client_progress_photos")
      .select("*")
      .eq("trainer_id", user.id)
      .eq("client_id", clientId)
      .eq("pose", normalizedPose)
      .single();

    // 5. Update or insert the baseline
    if (photoId === null) {
      // Clear baseline - set fields to null
      if (existingRow) {
        const { error: updateError } = await supabase
          .from("client_progress_photos")
          .update({
            baseline_photo_id: null,
            baseline_photo_url: null,
            baseline_photo_taken_at: null,
          })
          .eq("trainer_id", user.id)
          .eq("client_id", clientId)
          .eq("pose", normalizedPose);

        if (updateError) {
          console.error("[baseline] Update error:", updateError);
          return NextResponse.json(
            { error: "Failed to clear baseline" },
            { status: 500 }
          );
        }
      }
    } else {
      // Set baseline
      if (!photoUrl || !photoTakenAt) {
        return NextResponse.json(
          { error: "Missing required fields for setting baseline: photoUrl, photoTakenAt" },
          { status: 400 }
        );
      }

      if (existingRow) {
        // Update existing row
        const { error: updateError } = await supabase
          .from("client_progress_photos")
          .update({
            baseline_photo_id: photoId,
            baseline_photo_url: photoUrl,
            baseline_photo_taken_at: photoTakenAt,
          })
          .eq("trainer_id", user.id)
          .eq("client_id", clientId)
          .eq("pose", normalizedPose);

        if (updateError) {
          console.error("[baseline] Update error:", updateError);
          return NextResponse.json(
            { error: "Failed to set baseline" },
            { status: 500 }
          );
        }
      } else {
        // Insert new row (no auto-detected first/latest yet, just baseline)
        const { error: insertError } = await supabase
          .from("client_progress_photos")
          .insert({
            trainer_id: user.id,
            client_id: clientId,
            trainerize_user_id: clientRow.trainerize_id,
            pose: normalizedPose,
            baseline_photo_id: photoId,
            baseline_photo_url: photoUrl,
            baseline_photo_taken_at: photoTakenAt,
          });

        if (insertError) {
          console.error("[baseline] Insert error:", insertError);
          return NextResponse.json(
            { error: "Failed to set baseline" },
            { status: 500 }
          );
        }
      }
    }

    // 6. Fetch the updated row and return the comparison
    const { data: updatedRow } = await supabase
      .from("client_progress_photos")
      .select("*")
      .eq("trainer_id", user.id)
      .eq("client_id", clientId)
      .eq("pose", normalizedPose)
      .single();

    if (!updatedRow) {
      return NextResponse.json({ poseComparison: null });
    }

    const hasManualBaseline = !!updatedRow.baseline_photo_url;
    const baselineUrl = updatedRow.baseline_photo_url || updatedRow.first_photo_url;
    const baselineTakenAt = updatedRow.baseline_photo_taken_at || updatedRow.first_photo_taken_at;
    const baselineId = updatedRow.baseline_photo_id || updatedRow.first_photo_id;

    const poseComparison = {
      pose: normalizedPose,
      baselinePhoto: baselineUrl
        ? {
            id: baselineId || "first",
            url: baselineUrl,
            takenAt: baselineTakenAt,
            pose: normalizedPose,
            isManualBaseline: hasManualBaseline,
          }
        : null,
      latestPhoto: updatedRow.latest_photo_url
        ? {
            id: updatedRow.latest_photo_id || "latest",
            url: updatedRow.latest_photo_url,
            takenAt: updatedRow.latest_photo_taken_at,
            pose: normalizedPose,
          }
        : null,
    };

    return NextResponse.json({ poseComparison });
  } catch (error) {
    console.error("[baseline] Unexpected error:", error);
    return NextResponse.json(
      { error: "Failed to update baseline" },
      { status: 500 }
    );
  }
}
