import { NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { getTrainerizeCredentials } from "@/libs/trainerize/credentials";
import {
  createTrainerizeClient,
  TrainerizeClientError,
} from "@/libs/trainerize/client";

export const dynamic = "force-dynamic";

// -- Trainerize response types --

interface TrainerizePhotoListItem {
  id: number;
  date: string;
  pose?: string;
}

interface TrainerizePhotosListResponse {
  photos: TrainerizePhotoListItem[];
  total?: number;
}

// -- Our normalized types --

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
  secondLatestPhoto: ProgressPhoto | null;
  latestPhoto: ProgressPhoto | null;
}

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
    const { clientId, trainerizeUserId, startDate, endDate } = body;

    if (!clientId || !trainerizeUserId || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing required fields: clientId, trainerizeUserId, startDate, endDate" },
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

    // 4. Get Trainerize credentials and create client
    const credentials = await getTrainerizeCredentials(user.id);

    if (!credentials || !credentials.username) {
      return NextResponse.json(
        { error: "Trainerize credentials not found. Please configure them in settings." },
        { status: 400 }
      );
    }

    const trainerizeClient = createTrainerizeClient(credentials);

    // 5. Call Trainerize photos list endpoint
    // Response shape: { photos: [{ id, date, pose }], total }
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
      console.log(`[photos] Got ${photoList.length} photos from list (total: ${data.total})`);
    } catch (error) {
      if (error instanceof TrainerizeClientError) {
        console.error("[photos] Trainerize API error:", error.message, error.statusCode);
        return NextResponse.json(
          { error: `Trainerize error: ${error.message}` },
          { status: error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 502 }
        );
      }
      throw error;
    }

    // 6. Build proxy URLs for each photo
    const photos: ProgressPhoto[] = photoList.map((photoMeta) => ({
      id: String(photoMeta.id),
      url: `/api/trainerize/photos/image?userID=${trainerizeUserId}&photoid=${photoMeta.id}&thumbnail=false`,
      takenAt: photoMeta.date || new Date().toISOString(),
      pose: (photoMeta.pose || "unknown").toLowerCase(),
    }));

    console.log(`[photos] Built ${photos.length} proxy URLs from photo list`);

    // 7. Group photos by pose
    const photosByPose = new Map<string, ProgressPhoto[]>();
    for (const photo of photos) {
      const poseKey = photo.pose || "unknown";
      if (!photosByPose.has(poseKey)) {
        photosByPose.set(poseKey, []);
      }
      photosByPose.get(poseKey)!.push(photo);
    }

    // 8. Process each pose group: compute earliest/latest, upsert to DB
    const poseComparisons: Record<string, PoseComparison> = {};

    for (const [poseKey, posePhotos] of photosByPose.entries()) {
      const sorted = [...posePhotos].sort(
        (a, b) => new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime()
      );
      const earliestInRange = sorted[0];
      const latestInRange = sorted[sorted.length - 1];

      // Read existing row for this pose
      const { data: existingRow } = await supabase
        .from("client_progress_photos")
        .select("*")
        .eq("trainer_id", user.id)
        .eq("client_id", clientId)
        .eq("pose", poseKey)
        .single();

      // Compute new first photo (keep earlier if exists)
      let newFirstId = earliestInRange.id;
      let newFirstUrl = earliestInRange.url;
      let newFirstTakenAt = earliestInRange.takenAt;

      if (
        existingRow?.first_photo_taken_at &&
        new Date(existingRow.first_photo_taken_at).getTime() < new Date(newFirstTakenAt).getTime()
      ) {
        newFirstId = existingRow.first_photo_id;
        newFirstUrl = existingRow.first_photo_url;
        newFirstTakenAt = existingRow.first_photo_taken_at;
      }

      // Compute new latest and second-latest photos
      let newLatestId = latestInRange.id;
      let newLatestUrl = latestInRange.url;
      let newLatestTakenAt = latestInRange.takenAt;

      // Track second latest - start with second in range if available
      let newSecondLatestId = sorted.length > 1 ? sorted[sorted.length - 2].id : null;
      let newSecondLatestUrl = sorted.length > 1 ? sorted[sorted.length - 2].url : null;
      let newSecondLatestTakenAt = sorted.length > 1 ? sorted[sorted.length - 2].takenAt : null;

      if (existingRow?.latest_photo_taken_at) {
        const existingLatestTime = new Date(existingRow.latest_photo_taken_at).getTime();
        const newLatestTime = new Date(newLatestTakenAt).getTime();

        if (existingLatestTime > newLatestTime) {
          // Existing latest is newer - keep it, our latest becomes second latest
          newSecondLatestId = newLatestId;
          newSecondLatestUrl = newLatestUrl;
          newSecondLatestTakenAt = newLatestTakenAt;
          newLatestId = existingRow.latest_photo_id;
          newLatestUrl = existingRow.latest_photo_url;
          newLatestTakenAt = existingRow.latest_photo_taken_at;
          // Keep existing second latest if it's older than our new second latest
          if (existingRow.second_latest_photo_taken_at) {
            const existingSecondTime = new Date(existingRow.second_latest_photo_taken_at).getTime();
            if (existingSecondTime > new Date(newSecondLatestTakenAt!).getTime()) {
              newSecondLatestId = existingRow.second_latest_photo_id;
              newSecondLatestUrl = existingRow.second_latest_photo_url;
              newSecondLatestTakenAt = existingRow.second_latest_photo_taken_at;
            }
          }
        } else if (existingLatestTime < newLatestTime) {
          // Our latest is newer - existing latest becomes candidate for second latest
          const existingLatestAsSecondTime = existingLatestTime;
          const currentSecondLatestTime = newSecondLatestTakenAt ? new Date(newSecondLatestTakenAt).getTime() : 0;
          if (existingLatestAsSecondTime > currentSecondLatestTime) {
            newSecondLatestId = existingRow.latest_photo_id;
            newSecondLatestUrl = existingRow.latest_photo_url;
            newSecondLatestTakenAt = existingRow.latest_photo_taken_at;
          }
        } else {
          // Same latest - keep existing second latest if we don't have one
          if (!newSecondLatestId && existingRow.second_latest_photo_id) {
            newSecondLatestId = existingRow.second_latest_photo_id;
            newSecondLatestUrl = existingRow.second_latest_photo_url;
            newSecondLatestTakenAt = existingRow.second_latest_photo_taken_at;
          }
        }
      }

      // Upsert, preserving any manually-set baseline
      const { error: upsertError } = await supabase
        .from("client_progress_photos")
        .upsert(
          {
            trainer_id: user.id,
            client_id: clientId,
            trainerize_user_id: trainerizeUserId,
            pose: poseKey,
            first_photo_id: newFirstId,
            first_photo_url: newFirstUrl,
            first_photo_taken_at: newFirstTakenAt,
            second_latest_photo_id: newSecondLatestId,
            second_latest_photo_url: newSecondLatestUrl,
            second_latest_photo_taken_at: newSecondLatestTakenAt,
            latest_photo_id: newLatestId,
            latest_photo_url: newLatestUrl,
            latest_photo_taken_at: newLatestTakenAt,
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: "trainer_id,client_id,pose" }
        );

      if (upsertError) {
        console.error(`[photos] Upsert error for pose ${poseKey}:`, upsertError);
      }

      // Build comparison for response
      // Use baseline if set, otherwise fall back to first photo
      const hasManualBaseline = !!existingRow?.baseline_photo_url;
      const baselineUrl = existingRow?.baseline_photo_url || newFirstUrl;
      const baselineTakenAt = existingRow?.baseline_photo_taken_at || newFirstTakenAt;
      const baselineId = existingRow?.baseline_photo_id || newFirstId;

      poseComparisons[poseKey] = {
        pose: poseKey,
        baselinePhoto: {
          id: baselineId,
          url: baselineUrl,
          takenAt: baselineTakenAt,
          pose: poseKey,
          isManualBaseline: hasManualBaseline,
        },
        secondLatestPhoto: newSecondLatestUrl
          ? {
              id: newSecondLatestId!,
              url: newSecondLatestUrl,
              takenAt: newSecondLatestTakenAt!,
              pose: poseKey,
            }
          : null,
        latestPhoto: {
          id: newLatestId,
          url: newLatestUrl,
          takenAt: newLatestTakenAt,
          pose: poseKey,
        },
      };
    }

    // 9. Load comparisons for poses not in current range but stored in DB
    const { data: allPoseRows } = await supabase
      .from("client_progress_photos")
      .select("*")
      .eq("trainer_id", user.id)
      .eq("client_id", clientId);

    for (const row of allPoseRows || []) {
      if (!poseComparisons[row.pose] && (row.first_photo_url || row.baseline_photo_url)) {
        const hasManualBaseline = !!row.baseline_photo_url;
        const baselineUrl = row.baseline_photo_url || row.first_photo_url;
        const baselineTakenAt = row.baseline_photo_taken_at || row.first_photo_taken_at;
        const baselineId = row.baseline_photo_id || row.first_photo_id;

        poseComparisons[row.pose] = {
          pose: row.pose,
          baselinePhoto: baselineUrl
            ? {
                id: baselineId || "first",
                url: baselineUrl,
                takenAt: baselineTakenAt,
                pose: row.pose,
                isManualBaseline: hasManualBaseline,
              }
            : null,
          secondLatestPhoto: row.second_latest_photo_url
            ? {
                id: row.second_latest_photo_id || "second_latest",
                url: row.second_latest_photo_url,
                takenAt: row.second_latest_photo_taken_at,
                pose: row.pose,
              }
            : null,
          latestPhoto: row.latest_photo_url
            ? {
                id: row.latest_photo_id || "latest",
                url: row.latest_photo_url,
                takenAt: row.latest_photo_taken_at,
                pose: row.pose,
              }
            : null,
        };
      }
    }

    // 10. Build backward-compatible firstPhoto/latestPhoto (pick first available)
    const firstComparison = Object.values(poseComparisons)[0];
    const firstPhoto = firstComparison?.baselinePhoto || null;
    const latestPhoto = firstComparison?.latestPhoto || null;

    // 11. Return response
    return NextResponse.json({
      photos,
      poseComparisons,
      firstPhoto,
      latestPhoto,
    });
  } catch (error) {
    console.error("[photos] Unexpected error:", error);

    if (error instanceof TrainerizeClientError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch progress photos" },
      { status: 500 }
    );
  }
}
