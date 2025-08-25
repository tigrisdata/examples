import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.GOOGLE_API_KEY;
const ai = new GoogleGenAI({ apiKey: API_KEY });
const PROMPT_ENHANCER_MODEL = "gemini-2.5-flash";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawPrompt = (body?.prompt as string | undefined)?.trim() || "";
    if (!rawPrompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    // Extract suggested parameters as JSON
    const structured = await extractParametersWithGemini(rawPrompt);

    // Map to UI params (camelCase) so the frontend can directly consume
    const params = toUiParams(structured);

    // Return only parameters (no synthesized prompt)
    return NextResponse.json({ ok: true, structured, params });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Enhance failed" }, { status: 500 });
  }
}

type PromptKeywordInput = {
  subject?: string;
  action?: string;
  scene?: string;
  camera_angle?: string;
  camera_movement?: string;
  lens_effects?: string;
  style?: string;
  temporal_elements?: string;
  sound_effects?: string;
  dialogue?: string;
};

async function extractParametersWithGemini(rawPrompt: string): Promise<PromptKeywordInput> {
  const instruction = `You are a world-class film prompt designer. Given the user's raw idea below, PROPOSE a rich, cinematic parameter set that best realizes the intent. You may infer tasteful, plausible details and be creative, as long as you remain consistent with the user's idea (do not contradict hard constraints like characters, time period, or tone).

Return a JSON object with EXACTLY these keys:
  subject # @param {type: 'string'}
  action # @param {type: 'string'}
  scene # @param {type: 'string'}

  camera_angle # @param ["None", "Eye-Level Shot", "Low-Angle Shot", "High-Angle Shot", "Bird's-Eye View", "Top-Down Shot", "Worm's-Eye View", "Dutch Angle", "Canted Angle", "Close-Up", "Extreme Close-Up", "Medium Shot", "Full Shot", "Long Shot", "Wide Shot", "Establishing Shot", "Over-the-Shoulder Shot", "Point-of-View (POV) Shot"]
  camera_movement # @param ["None", "Static Shot (or fixed)", "Pan (left)", "Pan (right)", "Tilt (up)", "Tilt (down)", "Dolly (In)", "Dolly (Out)", "Zoom (In)", "Zoom (Out)", "Truck (Left)", "Truck (Right)", "Pedestal (Up)", "Pedestal (Down)", "Crane Shot", "Aerial Shot", "Drone Shot", "Handheld", "Shaky Cam", "Whip Pan", "Arc Shot"]
  lens_effects # @param ["None", "Wide-Angle Lens (e.g., 24mm)", "Telephoto Lens (e.g., 85mm)", "Shallow Depth of Field", "Bokeh", "Deep Depth of Field", "Lens Flare", "Rack Focus", "Fisheye Lens Effect", "Vertigo Effect (Dolly Zoom)"]
  style # @param ["None", "Photorealistic", "Cinematic", "Vintage", "Japanese anime style", "Claymation style", "Stop-motion animation", "In the style of Van Gogh", "Surrealist painting", "Monochromatic black and white", "Vibrant and saturated", "Film noir style", "High-key lighting", "Low-key lighting", "Golden hour glow", "Volumetric lighting", "Backlighting to create a silhouette"]
  temporal_elements # @param ["None", "Slow-motion", "Fast-paced action", "Time-lapse", "Hyperlapse", "Pulsating light", "Rhythmic movement"]

  sound_effects # @param ["None", "Sound of a phone ringing", "Water splashing", "Soft house sounds", "Ticking clock", "City traffic and sirens", "Waves crashing", "Quiet office hum"]
  dialogue # @param {type: 'string'}

Creative rules:
- Prefer concrete, evocative values. Only use "None" when a field is truly irrelevant.
- Keep each value a concise phrase (no multi-sentence essays).
- Be safe and non-offensive.

Output rules:
- Output ONLY a single JSON object. No markdown, no code fences, no commentary.
- Every key MUST appear.

User idea:\n${rawPrompt}`;

  const result = await ai.models.generateContent({
    model: PROMPT_ENHANCER_MODEL,
    contents: instruction,
  });

  const text = extractTextFromContentResult(result);
  const parsed = safeParseFirstJsonObject(text);
  if (parsed && typeof parsed === "object") {
    return normalizeStructured(parsed as Record<string, unknown>);
  }
  // Fallback minimal structure
  return normalizeStructured({ subject: rawPrompt, action: "None", scene: "None", camera_angle: "None", camera_movement: "None", lens_effects: "None", style: "None", temporal_elements: "None", sound_effects: "None", dialogue: "" });
}

function normalizeStructured(obj: Record<string, unknown>): PromptKeywordInput {
  const read = (k: string) => {
    const v = obj[k];
    if (typeof v === "string") return v.trim();
    if (v == null) return "None";
    try { return JSON.stringify(v); } catch { return String(v); }
  };
  return {
    subject: read("subject"),
    action: read("action"),
    scene: read("scene"),
    camera_angle: read("camera_angle"),
    camera_movement: read("camera_movement"),
    lens_effects: read("lens_effects"),
    style: read("style"),
    temporal_elements: read("temporal_elements"),
    sound_effects: read("sound_effects"),
    dialogue: read("dialogue"),
  };
}

function toUiParams(structured: PromptKeywordInput) {
  return {
    subject: (structured.subject || "").toString(),
    action: (structured.action || "").toString(),
    scene: (structured.scene || "").toString(),
    cameraAngle: (structured.camera_angle || "None").toString(),
    cameraMovement: (structured.camera_movement || "None").toString(),
    lensEffects: (structured.lens_effects || "None").toString(),
    style: (structured.style || "None").toString(),
    temporalElements: (structured.temporal_elements || "None").toString(),
    soundEffects: (structured.sound_effects || "None").toString(),
    dialogue: (structured.dialogue || "None").toString(),
  };
}

function extractTextFromContentResult(result: any): string {
  try {
    const maybeText = result?.response?.text?.();
    if (typeof maybeText === 'string' && maybeText.trim() !== '') return maybeText;
  } catch {}
  try {
    const parts = result?.response?.candidates?.[0]?.content?.parts;
    if (Array.isArray(parts)) {
      return parts.map((p: any) => p?.text || '').join('').trim();
    }
  } catch {}
  try {
    const altText = result?.text || result?.content || '';
    if (typeof altText === 'string') return altText;
  } catch {}
  return '';
}

function safeParseFirstJsonObject(text: string): unknown | null {
  if (!text) return null;
  // quick attempt
  try { return JSON.parse(text); } catch {}
  // scan for first balanced {...}
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        const slice = text.slice(start, i + 1);
        try { return JSON.parse(slice); } catch {}
      }
    }
  }
  return null;
}


