import { NextResponse, NextRequest } from "next/server";

interface TrainerListRequest {
  username: string;
  password: string;
}

interface TrainerListResponse {
  trainers: Array<{
    firstName: string;
    id: string;
  }>;
}

export async function POST(req: NextRequest) {
  try {
    const body: TrainerListRequest = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    // Create base64 encoded credentials
    const credentials = Buffer.from(`${username}:${password}`).toString("base64");

    // Make request to Trainerize API to get trainer list
    const response = await fetch("https://api.trainerize.com/v03/user/getTrainerList", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        locationID: 1268,
        sort: "name",
        start: 0,
        count: 10
      })
    });

    if (!response.ok) {
      if (response.status === 401) {
        return NextResponse.json(
          { error: "Invalid username or password" },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: "Failed to fetch trainer list" },
        { status: response.status }
      );
    }

    // Get the response data
    const data = await response.json();

    // Extract trainers with firstName and id
    const trainers = data.users?.map((user: any) => ({
      firstName: user.firstName || "Unknown",
      id: user.id?.toString() || ""
    })) || [];

    const responseData: TrainerListResponse = {
      trainers
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Trainerize trainer list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch trainer list" },
      { status: 500 }
    );
  }
} 