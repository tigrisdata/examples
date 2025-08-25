import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, GeneratedVideo } from "@google/genai";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const API_KEY = process.env.GOOGLE_API_KEY;
const ai = new GoogleGenAI({
  apiKey: API_KEY,
});
const VEO3_MODEL_NAME = 'veo-3.0-generate-preview';

const S3_BUCKET_NAME = "veo3";
const S3_REGION = "auto";
const S3_ENDPOINT = "https://t3.storage.dev";
const S3_FORCE_PATH_STYLE = false;

const s3 = new S3Client({
  region: S3_REGION,
  endpoint: S3_ENDPOINT,
  forcePathStyle: S3_FORCE_PATH_STYLE,
  credentials: {
    accessKeyId: process.env.TIGRIS_STORAGE_ACCESS_KEY_ID!,
    secretAccessKey: process.env.TIGRIS_STORAGE_SECRET_ACCESS_KEY!,
  },
});

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
): Promise<string[]> {
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

    return await Promise.all(
      videos.map(async (generatedVideo: GeneratedVideo, index: number) => {
        const uri = `${generatedVideo.video?.uri || ''}?key=${API_KEY}`;
        const res = await fetch(uri);
        
        if (!res.ok) {
          throw new Error(`Failed to fetch video: ${res.status} ${res.statusText}`);
        }
        const contentType = res.headers.get('content-type') || 'application/octet-stream';
        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const extension = contentType.includes('mp4') ? '.mp4' : contentType.includes('quicktime') ? '.mov' : '';
        const uniqueId = (global as any).crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const objectKey = `videos/${uniqueId}${extension || `.mp4`}`;

        await uploadObject(buffer, contentType, objectKey);

        const videoUrl = getObject(S3_BUCKET_NAME, objectKey);
        return videoUrl;
      }),
    );
  } else {
    throw new Error('No videos generated');
  }
}

async function uploadObject(buffer: Buffer, contentType: string, objectKey: string) {
  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: objectKey,
      Body: buffer,
      ContentType: contentType,
    }),
  );
}

async function getObject(bucket: string, objectKey: string) {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: objectKey,
  });
  return await getSignedUrl(s3, command, { expiresIn: 60 * 60 });
}
