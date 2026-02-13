import { NextResponse, NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password, trainerId } = body;

    if (!username || !password || !trainerId) {
      return NextResponse.json(
        { error: "Username, password, and trainer ID are required" },
        { status: 400 }
      );
    }

    // Create base64 encoded credentials
    const credentials = Buffer.from(`${username}:${password}`).toString("base64");

    // Make request to Trainerize API
    const response = await fetch("https://api.trainerize.com/v03/user/getClientList", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userID: trainerId,
        view: "allActive",
        sort: "name"
      })
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: response.status }
      );
    }

    // Get the response data
    const data = await response.json();

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Trainerize verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify credentials" },
      { status: 500 }
    );
  }
} 