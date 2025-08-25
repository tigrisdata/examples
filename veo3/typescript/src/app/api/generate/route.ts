import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, GeneratedVideo } from "@google/genai";

const API_KEY = process.env.GOOGLE_API_KEY;
const ai = new GoogleGenAI({
  apiKey: API_KEY,
});
const VEO3_MODEL_NAME = 'veo-3.0-generate-preview';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const numberOfVideos = 1;

    const prompt = body.prompt as string | "";

    const url = await generateVideoFromText(prompt, numberOfVideos);
    return NextResponse.json({ url });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to generate' }, { status: 500 });
  }
}

async function generateVideoFromText(
  prompt: string,
  numberOfVideos = 1,
): Promise<string> {
  let operation = await ai.models.generateVideos({
    model: VEO3_MODEL_NAME,
    prompt,
    config: {
      numberOfVideos,
      aspectRatio: '16:9',
    },
  });

  while (!operation.done) {
    await new Promise((resolve) => setTimeout(resolve, 10000));
    console.log('...Generating...');
    operation = await ai.operations.getVideosOperation({ operation });
  }

  if (operation?.response) {
    const videos = operation.response?.generatedVideos;
    if (videos === undefined || videos.length === 0) {
      throw new Error('No videos generated');
    }

    console.log(videos);

    const uri = `${videos[0].video?.uri}&key=${API_KEY}`;
    console.log('Downloading video from:', uri);
    return uri;

  } else {
    throw new Error('No videos generated');
  }
}