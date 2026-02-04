import { NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { getTrainerizeCredentials } from "@/libs/trainerize/credentials";
import {
  createTrainerizeClient,
  TrainerizeClientError,
} from "@/libs/trainerize/client";

export const dynamic = "force-dynamic";

interface TrainerizePhotoListItem {
  id: number;
  date: string;
  pose?: string;
}

interface TrainerizePhotosListResponse {
  photos: TrainerizePhotoListItem[];
  total?: number;
}

interface ProgressPhoto {
  id: string;
  url: string;
  takenAt: string;
  pose?: string;
  isManualBaseline?: boolean;
}

interface PoseComparison {
  pose: string;
  baselinePhoto: ProgressPhoto | null;
  latestPhoto: ProgressPhoto | null;
}

/**
 * POST /api/trainerize/photos/sync-all
 *
 * Fetches ALL photos for a client from Trainerize (2015 to today),
 * finding the true first and latest photo for each pose.
 * Updates the client_progress_photos table but preserves manual baselines.
 */
export async function POST(request: Request) {
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
    const { clientId, trainerizeUserId } = body;

    if (!clientId || !trainerizeUserId) {
      return NextResponse.json(
        { error: "Missing required fields: clientId, trainerizeUserId" },
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

    // 4. Get Trainerize credentials
    const credentials = await getTrainerizeCredentials(user.id);

    if (!credentials || !credentials.username) {
      return NextResponse.json(
        { error: "Trainerize credentials not found. Please configure them in settings." },
        { status: 400 }
      );
    }

    const trainerizeClient = createTrainerizeClient(credentials);

    // 5. Fetch ALL photos from 2015 to today
    const startDate = "2015-01-01";
    const endDate = new Date().toISOString().split("T")[0];

    let photoList: TrainerizePhotoListItem[] = [];
    try {
      const { data } = await trainerizeClient.request<TrainerizePhotosListResponse>(
        "/v03/photos/getList",
        {
          method: "POST",
          body: {
            userID: trainerizeUserId,
            startDate,
            endDate,
          },
        }
      );
      photoList = data.photos || [];
      console.log(`[sync-all] Got ${photoList.length} total photos for client (total: ${data.total})`);
    } catch (error) {
      if (error instanceof TrainerizeClientError) {
        console.error("[sync-all] Trainerize API error:", error.message, error.statusCode);
        return NextResponse.json(
          { error: `Trainerize error: ${error.message}` },
          { status: error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 502 }
        );
      }
      throw error;
    }

    // 6. Group photos by pose and find earliest/latest for each
    const photosByPose = new Map<string, TrainerizePhotoListItem[]>();
    for (const photo of photoList) {
      const poseKey = (photo.pose || "unknown").toLowerCase();
      if (!photosByPose.has(poseKey)) {
        photosByPose.set(poseKey, []);
      }
      photosByPose.get(poseKey)!.push(photo);
    }

    // 7. Process each pose: upsert first/latest, preserve baselines
    const poseComparisons: Record<string, PoseComparison> = {};
    let earliestDate: string | null = null;

    for (const [poseKey, posePhotos] of photosByPose.entries()) {
      const sorted = [...posePhotos].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      const firstPhoto = sorted[0];
      const latestPhoto = sorted[sorted.length - 1];

      // Track overall earliest date for success message
      if (!earliestDate || new Date(firstPhoto.date).getTime() < new Date(earliestDate).getTime()) {
        earliestDate = firstPhoto.date;
      }

      // Build URLs
      const firstUrl = `/api/trainerize/photos/image?userID=${trainerizeUserId}&photoid=${firstPhoto.id}&thumbnail=false`;
      const latestUrl = `/api/trainerize/photos/image?userID=${trainerizeUserId}&photoid=${latestPhoto.id}&thumbnail=false`;

      // Read existing row to preserve baseline
      const { data: existingRow } = await supabase
        .from("client_progress_photos")
        .select("*")
        .eq("trainer_id", user.id)
        .eq("client_id", clientId)
        .eq("pose", poseKey)
        .single();

      // Upsert with new first/latest
      const { error: upsertError } = await supabase
        .from("client_progress_photos")
        .upsert(
          {
            trainer_id: user.id,
            client_id: clientId,
            trainerize_user_id: trainerizeUserId,
            pose: poseKey,
            first_photo_id: String(firstPhoto.id),
            first_photo_url: firstUrl,
            first_photo_taken_at: firstPhoto.date,
            latest_photo_id: String(latestPhoto.id),
            latest_photo_url: latestUrl,
            latest_photo_taken_at: latestPhoto.date,
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: "trainer_id,client_id,pose" }
        );

      if (upsertError) {
        console.error(`[sync-all] Upsert error for pose ${poseKey}:`, upsertError);
      }

      // Build comparison for response
      const hasManualBaseline = !!existingRow?.baseline_photo_url;
      const baselineUrl = existingRow?.baseline_photo_url || firstUrl;
      const baselineTakenAt = existingRow?.baseline_photo_taken_at || firstPhoto.date;
      const baselineId = existingRow?.baseline_photo_id || String(firstPhoto.id);

      poseComparisons[poseKey] = {
        pose: poseKey,
        baselinePhoto: {
          id: baselineId,
          url: baselineUrl,
          takenAt: baselineTakenAt,
          pose: poseKey,
          isManualBaseline: hasManualBaseline,
        },
        latestPhoto: {
          id: String(latestPhoto.id),
          url: latestUrl,
          takenAt: latestPhoto.date,
          pose: poseKey,
        },
      };
    }

    console.log(`[sync-all] Synced ${photosByPose.size} poses, earliest photo: ${earliestDate}`);

    return NextResponse.json({
      poseComparisons,
      totalPhotos: photoList.length,
      earliestDate,
      posesFound: Array.from(photosByPose.keys()),
    });
  } catch (error) {
    console.error("[sync-all] Unexpected error:", error);

    if (error instanceof TrainerizeClientError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to sync photos" },
      { status: 500 }
    );
  }
}
