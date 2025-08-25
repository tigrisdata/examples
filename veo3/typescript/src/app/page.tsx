"use client";

import { useState, useEffect } from "react";

export default function Home() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawPrompt, setRawPrompt] = useState<string>("");

  const isYouTubeUrl = (url: string) => /(?:youtube\.com|youtu\.be)/.test(url);
  const toYouTubeEmbed = (url: string) => {
    try {
      const u = new URL(url);
      if (u.hostname.includes("youtube.com") && u.searchParams.get("v")) {
        return `https://www.youtube.com/embed/${u.searchParams.get("v")}`;
      }
      if (u.hostname.includes("youtu.be")) {
        return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
      }
    } catch {}
    return url;
  };

  const handleGenerate = async () => {
    try {
      setError(null);
      setIsGenerating(true);
      setVideoUrl(null);

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawPrompt
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed with ${res.status}`);
      }

      const data = await res.json();
      setVideoUrl(data?.url);
    } catch (e: any) {
      setError(e?.message || "Failed to generate video");
    } finally {
      setIsGenerating(false);
    }
  };

  // Keyboard shortcuts: Cmd+Enter to generate, Cmd+K to toggle sidebar, Cmd+E to enhance
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === "Enter") {
        e.preventDefault();
        if (!isGenerating) {
          void handleGenerate();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isGenerating, rawPrompt, handleGenerate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 p-8">
      <div className="max-w-6xl mx-auto relative">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-gray-900 mb-2">
              Text-to-Video Generator
            </h1>
            <p className="text-lg text-gray-600">
              Create stunning videos with AI using customizable parameters
            </p>
          </div>
        </header>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Prompt Enhancer</h2>
            <p className="text-sm text-gray-600 mb-3">Paste a brief idea and let the model extract parameters and synthesize a cinematic prompt.</p>
            <textarea
              value={rawPrompt}
              onChange={(e) => setRawPrompt(e.target.value)}
              rows={4}
              placeholder="Describe your idea..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder:text-gray-400"
            />
            <div className="mt-3 flex items-center gap-3">
              {error && (
                <span className="text-sm text-red-600">{error}</span>
              )}
            </div>
          </div>
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Preview</h2>
            {videoUrl ? (
              // TODO: remove YouTube player when veo3 is implemented
              isYouTubeUrl(videoUrl) ? (
                <div className="w-full rounded-lg border border-gray-200 overflow-hidden">
                  <div style={{ aspectRatio: "16 / 9" }}>
                    <iframe
                      className="w-full h-full"
                      src={toYouTubeEmbed(videoUrl)}
                      title="YouTube video player"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
                  </div>
                </div>
              ) : (
                <video
                  className="w-full rounded-lg border border-gray-200"
                  controls
                  src={videoUrl}
                />
              )
            ) : (
              <div className="w-full h-64 bg-gray-50 rounded-lg border border-gray-200 grid place-items-center text-gray-500">
                No video generated yet
              </div>
            )}
          </div>

          {/* Generate Button */}
          <div className="text-center">
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-3 px-8 rounded-lg shadow-sm transition-colors duration-200 disabled:cursor-not-allowed"
            >
              {isGenerating ? "Generating Video..." : "Generate Video (⌘+Return)"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
