import { z } from "zod";
import { getActiveChannelByName } from "../../../lib/channelStore";
import { corsHeaders, getClientIp, getSessionId, signStreamToken } from "../../../lib/security";

const schema = z.object({
  channelName: z.string().min(1).max(160),
  embed: z.boolean().optional(),
  parentOrigin: z.string().max(300).optional()
});

function publicStreamType(sourceUrl = "") {
  return /\.m3u8(?:$|[?#])/i.test(sourceUrl) ? "hls" : "mpegts";
}

export async function OPTIONS(request) {
  return new Response(null, { headers: corsHeaders(request) });
}

export async function POST(request) {
  try {
    const parsed = schema.parse(await request.json());

    const channel = await getActiveChannelByName(parsed.channelName);
    if (!channel) {
      return Response.json({ error: "Channel unavailable." }, { status: 404, headers: corsHeaders(request) });
    }

    const token = signStreamToken({
      channelName: channel.name,
      ip: getClientIp(request),
      sessionId: getSessionId(request)
    });

    return Response.json(
      {
        token,
        channelName: channel.name,
        expiresIn: 300,
        streamType: publicStreamType(channel.original_url),
        streamUrl: `/api/stream/${encodeURIComponent(channel.name)}?token=${encodeURIComponent(token)}`
      },
      { headers: corsHeaders(request) }
    );
  } catch {
    return Response.json({ error: "Unable to issue stream token." }, { status: 400, headers: corsHeaders(request) });
  }
}
