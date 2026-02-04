import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/libs/supabase/server";
import {
  getTrainerizeCredentials,
  createBasicAuthHeader,
} from "@/libs/trainerize/credentials";

export const dynamic = "force-dynamic";

/**
 * GET /api/trainerize/photos/image?userID=123&photoid=456&thumbnail=false
 *
 * Proxies a progress photo from Trainerize's /v03/photos/getByID endpoint,
 * which returns raw JPEG binary. We authenticate with Trainerize on the
 * server side and stream the image back to the browser.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userID = searchParams.get("userID");
    const photoid = searchParams.get("photoid");
    const thumbnail = searchParams.get("thumbnail") === "true";

    if (!userID || !photoid) {
      return NextResponse.json(
        { error: "Missing required params: userID, photoid" },
        { status: 400 }
      );
    }

    // Auth check
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get Trainerize credentials
    const credentials = await getTrainerizeCredentials(user.id);
    if (!credentials || !credentials.username) {
      return NextResponse.json(
        { error: "Trainerize credentials not found" },
        { status: 400 }
      );
    }

    const authHeader = createBasicAuthHeader(credentials);

    // Fetch raw image from Trainerize
    const trainerizeResponse = await fetch(
      "https://api.trainerize.com/v03/photos/getByID",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${authHeader}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userID: parseInt(userID, 10),
          photoid: parseInt(photoid, 10),
          thumbnail,
        }),
      }
    );

    if (!trainerizeResponse.ok) {
      console.error(
        `[photos/image] Trainerize returned ${trainerizeResponse.status} for photo ${photoid}`
      );
      return NextResponse.json(
        { error: "Failed to fetch photo" },
        { status: trainerizeResponse.status }
      );
    }

    // Stream the raw image bytes back
    const imageBuffer = await trainerizeResponse.arrayBuffer();
    const contentType =
      trainerizeResponse.headers.get("content-type") || "image/jpeg";

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch (error) {
    console.error("[photos/image] Unexpected error:", error);
    return NextResponse.json(
      { error: "Failed to fetch photo" },
      { status: 500 }
    );
  }
}
