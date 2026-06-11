"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Room, RoomEvent, Track } from "livekit-client";
import { useRouter } from "next/navigation";
import Pulse from "./CirclePulse";

interface LiveKitInterviewProps {
  stopCall: boolean;
  questionsArray: string[];
  timeleft: number;
  name: string;
  interviewId: string;
  userId: string;
  duration: number;
  setTranscript: React.Dispatch<React.SetStateAction<string[]>>;
  setError: any;
}

export default function LiveKitInterview({
  stopCall,
  questionsArray,
  timeleft,
  name,
  interviewId,
  userId,
  duration,
  setTranscript,
  setError,
}: LiveKitInterviewProps) {
  const roomRef = useRef<Room | null>(null);
  const router = useRouter();
  const warningSentRef = useRef(false);
  const [audioBlocked, setAudioBlocked] = useState(false);

  const tryStartAudio = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    room.startAudio()
      .then(() => {
        console.log("[LiveKit] startAudio() succeeded, canPlayback:", room.canPlaybackAudio);
        setAudioBlocked(false);
      })
      .catch((err) => console.error("[LiveKit] startAudio() failed:", err));
  }, []);

  useEffect(() => {
    let cleaned = false;

    const connect = async () => {
      try {
        const res = await fetch("/api/livekit/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ interviewId, userId, name, questionsArray, duration }),
        });

        if (!res.ok) {
          if (!cleaned) setError(true);
          return;
        }

        if (cleaned) return;

        const { token, url } = await res.json();
        const room = new Room();
        roomRef.current = room;

        room.on(RoomEvent.DataReceived, (payload) => {
          try {
            const data = JSON.parse(new TextDecoder().decode(payload));
            if (data.type === "transcript" && data.text) {
              setTranscript((prev) => [...prev, data.text]);
            }
          } catch {
            // ignore malformed packets
          }
        });

        room.on(RoomEvent.Disconnected, () => {
          if (cleaned) return;
          setTimeout(() => {
            router.push(`/results?p=${interviewId}&q=${userId}`);
          }, 2000);
        });

        room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
          console.log("[LiveKit] AudioPlaybackStatusChanged, canPlayback:", room.canPlaybackAudio);
          if (!cleaned) setAudioBlocked(!room.canPlaybackAudio);
        });

        room.on(RoomEvent.TrackSubscribed, (track, pub, participant) => {
          console.log("[LiveKit] TrackSubscribed:", track.kind, "from", participant.identity);
          if (track.kind === Track.Kind.Audio) {
            console.log("[LiveKit] Attaching agent audio track");
            const el = track.attach();
            // Ensure the element is live so the browser renders audio
            el.volume = 1;
            el.muted = false;
            el.play().catch((e) =>
              console.warn("[LiveKit] audio.play() blocked:", e)
            );
          }
        });

        room.on(RoomEvent.TrackUnsubscribed, (track) => {
          if (track.kind === Track.Kind.Audio) {
            console.log("[LiveKit] Agent audio track unsubscribed");
            track.detach();
          }
        });

        await room.connect(url, token);
        console.log("[LiveKit] Connected, canPlaybackAudio:", room.canPlaybackAudio);

        if (cleaned) {
          room.disconnect();
          return;
        }

        if (!room.canPlaybackAudio) {
          setAudioBlocked(true);
        }

        room.startAudio().catch(() => {});
      } catch (err) {
        if (!cleaned) {
          console.error("[LiveKit] connection error:", err);
          setError(true);
        }
      }
    };

    connect();

    return () => {
      cleaned = true;
      roomRef.current?.disconnect();
      roomRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewId, userId]);

  useEffect(() => {
    if (stopCall) roomRef.current?.disconnect();
  }, [stopCall]);

  useEffect(() => {
    if (timeleft > 30 || warningSentRef.current || !roomRef.current) return;
    warningSentRef.current = true;
    const payload = new TextEncoder().encode(
      JSON.stringify({ type: "time_warning", secondsLeft: 30 })
    );
    roomRef.current.localParticipant
      .publishData(payload, { reliable: true })
      .catch(() => {});
  }, [timeleft]);

  return (
    <div
      className="relative cursor-pointer"
      onClick={audioBlocked ? tryStartAudio : undefined}
      title={audioBlocked ? "Click to enable audio" : undefined}
    >
      <Pulse />
      {audioBlocked && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <span className="bg-black/70 text-white text-xs font-semibold px-3 py-1.5 rounded-full pointer-events-none">
            Tap to enable audio
          </span>
        </div>
      )}
    </div>
  );
}
