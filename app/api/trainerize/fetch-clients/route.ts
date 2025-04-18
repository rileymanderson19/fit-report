import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/libs/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();

    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in to fetch clients" },
        { status: 401 }
      );
    }

    // Get the user's Trainerize credentials
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("trainerize_username, trainerize_password, trainerize_id")
      .eq("id", user.id)
      .single();

    if (error || !profile?.trainerize_username) {
      return NextResponse.json(
        { error: "Trainerize credentials not found" },
        { status: 400 }
      );
    }

    // Create base64 encoded credentials
    const credentials = Buffer.from(`${profile.trainerize_username}:${profile.trainerize_password}`).toString("base64");

    // Make request to Trainerize API
    const response = await fetch("https://api.trainerize.com/v03/user/getClientList", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userID: profile.trainerize_id,
        view: "allActive",
        sort: "name"
      })
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch clients from Trainerize" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching Trainerize clients:", error);
    return NextResponse.json(
      { error: "Failed to fetch clients" },
      { status: 500 }
    );
  }
} 