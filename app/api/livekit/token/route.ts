import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import { NextResponse } from "next/server";

const LIVEKIT_URL = process.env.LIVEKIT_URL!;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY!;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET!;

export async function POST(req: Request) {
  try {
    const { interviewId, userId, name, questionsArray, duration } =
      await req.json();

    if (!interviewId || !userId || !questionsArray?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const httpUrl = LIVEKIT_URL.replace("wss://", "https://").replace(
      "ws://",
      "http://"
    );

    const svc = new RoomServiceClient(httpUrl, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

    // Create room with interview metadata so the agent can read it
    await svc.createRoom({
      name: interviewId,
      metadata: JSON.stringify({
        questions: questionsArray,
        name: name || "Candidate",
        duration: duration ?? 10,
        interviewId,
        userId,
      }),
      emptyTimeout: 300,
      maxParticipants: 3,
    });

    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: userId,
      name: name || "Candidate",
    });

    at.addGrant({
      roomJoin: true,
      room: interviewId,
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({ token, url: LIVEKIT_URL });
  } catch (err) {
    console.error("LiveKit token error:", err);
    return NextResponse.json({ error: "Failed to create token" }, { status: 500 });
  }
}
