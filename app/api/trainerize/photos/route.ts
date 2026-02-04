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
    // Trainerize getByID returns raw JPEG binary, so we proxy through our own endpoint
    const photos: ProgressPhoto[] = photoList.map((photoMeta) => ({
      id: String(photoMeta.id),
      url: `/api/trainerize/photos/image?userID=${trainerizeUserId}&photoid=${photoMeta.id}&thumbnail=false`,
      takenAt: photoMeta.date || new Date().toISOString(),
      pose: photoMeta.pose,
    }));

    console.log(`[photos] Built ${photos.length} proxy URLs from photo list`);

    // 7. Compute earliest and latest in range
    let earliestInRange: ProgressPhoto | null = null;
    let latestInRange: ProgressPhoto | null = null;

    if (photos.length > 0) {
      const sorted = [...photos].sort(
        (a, b) => new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime()
      );
      earliestInRange = sorted[0];
      latestInRange = sorted[sorted.length - 1];
    }

    // 8. Upsert client_progress_photos
    let firstPhoto: ProgressPhoto | null = null;
    let latestPhoto: ProgressPhoto | null = null;

    // Read existing record
    const { data: existingRow } = await supabase
      .from("client_progress_photos")
      .select("*")
      .eq("trainer_id", user.id)
      .eq("client_id", clientId)
      .single();

    if (photos.length > 0) {
      // Determine new first photo
      let newFirstUrl = earliestInRange!.url;
      let newFirstTakenAt = earliestInRange!.takenAt;

      if (
        existingRow?.first_photo_taken_at &&
        new Date(existingRow.first_photo_taken_at).getTime() <
          new Date(newFirstTakenAt).getTime()
      ) {
        newFirstUrl = existingRow.first_photo_url;
        newFirstTakenAt = existingRow.first_photo_taken_at;
      }

      // Determine new latest photo
      let newLatestUrl = latestInRange!.url;
      let newLatestTakenAt = latestInRange!.takenAt;

      if (
        existingRow?.latest_photo_taken_at &&
        new Date(existingRow.latest_photo_taken_at).getTime() >
          new Date(newLatestTakenAt).getTime()
      ) {
        newLatestUrl = existingRow.latest_photo_url;
        newLatestTakenAt = existingRow.latest_photo_taken_at;
      }

      const upsertData = {
        trainer_id: user.id,
        client_id: clientId,
        trainerize_user_id: trainerizeUserId,
        first_photo_url: newFirstUrl,
        first_photo_taken_at: newFirstTakenAt,
        latest_photo_url: newLatestUrl,
        latest_photo_taken_at: newLatestTakenAt,
        last_synced_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabase
        .from("client_progress_photos")
        .upsert(upsertData, {
          onConflict: "trainer_id,client_id",
        });

      if (upsertError) {
        console.error("[photos] Upsert error:", upsertError);
      }

      firstPhoto = {
        id: "first",
        url: newFirstUrl,
        takenAt: newFirstTakenAt,
      };
      latestPhoto = {
        id: "latest",
        url: newLatestUrl,
        takenAt: newLatestTakenAt,
      };
    } else if (existingRow) {
      if (existingRow.first_photo_url && existingRow.first_photo_taken_at) {
        firstPhoto = {
          id: "first",
          url: existingRow.first_photo_url,
          takenAt: existingRow.first_photo_taken_at,
        };
      }
      if (existingRow.latest_photo_url && existingRow.latest_photo_taken_at) {
        latestPhoto = {
          id: "latest",
          url: existingRow.latest_photo_url,
          takenAt: existingRow.latest_photo_taken_at,
        };
      }

      await supabase
        .from("client_progress_photos")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("trainer_id", user.id)
        .eq("client_id", clientId);
    }

    // 9. Return response
    return NextResponse.json({
      photos,
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
