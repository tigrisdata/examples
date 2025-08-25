"use client";

import { useState, useEffect } from "react";

// Video generation parameters with default values
const DEFAULT_PARAMS = {
  subject: "",
  action: "",
  scene: "",
  cameraAngle: "None",
  cameraMovement: "None",
  lensEffects: "None",
  style: "None",
  temporalElements: "None",
  soundEffects: "None",
  dialogue: ""
};

// Option arrays for select inputs
const CAMERA_ANGLES = [
  "None", "Eye-Level Shot", "Low-Angle Shot", "High-Angle Shot", "Bird's-Eye View", 
  "Top-Down Shot", "Worm's-Eye View", "Dutch Angle", "Canted Angle", "Close-Up", 
  "Extreme Close-Up", "Medium Shot", "Full Shot", "Long Shot", "Wide Shot", 
  "Establishing Shot", "Over-the-Shoulder Shot", "Point-of-View (POV) Shot"
];

const CAMERA_MOVEMENTS = [
  "None", "Static Shot (or fixed)", "Pan (left)", "Pan (right)", "Tilt (up)", 
  "Tilt (down)", "Dolly (In)", "Dolly (Out)", "Zoom (In)", "Zoom (Out)", 
  "Truck (Left)", "Truck (Right)", "Pedestal (Up)", "Pedestal (Down)", 
  "Crane Shot", "Aerial Shot", "Drone Shot", "Handheld", "Shaky Cam", 
  "Whip Pan", "Arc Shot"
];

const LENS_EFFECTS = [
  "None", "Wide-Angle Lens (e.g., 24mm)", "Telephoto Lens (e.g., 85mm)", 
  "Shallow Depth of Field", "Bokeh", "Deep Depth of Field", "Lens Flare", 
  "Rack Focus", "Fisheye Lens Effect", "Vertigo Effect (Dolly Zoom)"
];

const STYLES = [
  "None", "Photorealistic", "Cinematic", "Vintage", "Japanese anime style", 
  "Claymation style", "Stop-motion animation", "In the style of Van Gogh", 
  "Surrealist painting", "Monochromatic black and white", "Vibrant and saturated", 
  "Film noir style", "High-key lighting", "Low-key lighting", "Golden hour glow", 
  "Volumetric lighting", "Backlighting to create a silhouette"
];

const TEMPORAL_ELEMENTS = [
  "None", "Slow-motion", "Fast-paced action", "Time-lapse", "Hyperlapse", 
  "Pulsating light", "Rhythmic movement"
];

const SOUND_EFFECTS = [
  "None", "Sound of a phone ringing", "Water splashing", "Soft house sounds", 
  "Ticking clock", "City traffic and sirens", "Waves crashing", "Quiet office hum"
];

export default function Home() {
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawPrompt, setRawPrompt] = useState<string>("");
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);

  const handleInputChange = (field: string, value: string) => {
    setParams(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerate = async () => {
    try {
      setError(null);
      setIsGenerating(true);
      setVideoUrl(null);

      const promptParts = [
        params.subject,
        params.action,
        params.scene,
        `Camera angle: ${params.cameraAngle}`,
        `Camera movement: ${params.cameraMovement}`,
        `Lens: ${params.lensEffects}`,
        `Style: ${params.style}`,
        `Temporal: ${params.temporalElements}`,
        `SFX: ${params.soundEffects}`,
        `Dialogue: ${params.dialogue}`,
      ].filter(Boolean);
      const constructedPrompt = promptParts.join(". ");
      const explicitPrompt = rawPrompt.trim();
      const finalPrompt = explicitPrompt || constructedPrompt;

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: finalPrompt, numberOfVideos: 1 }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed with ${res.status}`);
      }

      const data = await res.json();
      const returned = data?.url;
      const firstUrl = Array.isArray(returned) ? returned[0] : returned;
      if (!firstUrl || typeof firstUrl !== "string") {
        throw new Error("No video URL returned");
      }
      setVideoUrl(firstUrl);
    } catch (e: any) {
      setError(e?.message || "Failed to generate video");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEnhance = async () => {
    try {
      setError(null);
      setIsEnhancing(true);

      const res = await fetch("/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: rawPrompt })
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Enhance failed with ${res.status}`);
      }

      const data = await res.json();
      const structured = (data?.structured || {}) as any;

      // Map structured fields to UI params
      if (structured && typeof structured === "object") {
        const mapped = {
          subject: String(structured.subject ?? params.subject ?? ""),
          action: String(structured.action ?? params.action ?? ""),
          scene: String(structured.scene ?? params.scene ?? ""),
          cameraAngle: String(structured.camera_angle ?? params.cameraAngle ?? "None"),
          cameraMovement: String(structured.camera_movement ?? params.cameraMovement ?? "None"),
          lensEffects: String(structured.lens_effects ?? params.lensEffects ?? "None"),
          style: String(structured.style ?? params.style ?? "None"),
          temporalElements: String(structured.temporal_elements ?? params.temporalElements ?? "None"),
          soundEffects: String(structured.sound_effects ?? params.soundEffects ?? "None"),
          dialogue: String(structured.dialogue ?? params.dialogue ?? "None"),
        };
        setParams(mapped);
        setSidebarOpen(true);
      }

        if (!structured) {
        throw new Error("No enhancement output returned");
      }
    } catch (e: any) {
      setError(e?.message || "Failed to enhance prompt");
    } finally {
      setIsEnhancing(false);
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
      if (e.metaKey && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setSidebarOpen(prev => !prev);
      }
      if (e.metaKey && (e.key === "e" || e.key === "E")) {
        e.preventDefault();
        if (!isEnhancing && rawPrompt.trim()) {
          void handleEnhance();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isGenerating, isEnhancing, rawPrompt, handleGenerate, handleEnhance]);

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
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-50 shadow-sm"
            >
              Parameters (Cmd+K)
            </button>
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
              <button
                onClick={handleEnhance}
                disabled={isEnhancing || !rawPrompt.trim()}
                className="inline-flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-semibold py-2 px-5 rounded-lg shadow-sm transition-colors duration-200 disabled:cursor-not-allowed"
              >
                {isEnhancing ? "Enhancing..." : "Enhance (Cmd+E)"}
              </button>
              {error && (
                <span className="text-sm text-red-600">{error}</span>
              )}
            </div>
          </div>
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Preview</h2>
            {videoUrl ? (
              <video
                className="w-full rounded-lg border border-gray-200"
                controls
                src={videoUrl}
              />
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
              {isGenerating ? "Generating Video..." : "Generate Video (Cmd+Return)"}
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar Overlay */}
      <div
        className={`fixed inset-0 bg-black/30 transition-opacity duration-300 z-40 ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Collapsible Right Sidebar */}
      <aside
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white border-l border-gray-200 shadow-xl z-50 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="h-full flex flex-col">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Parameters</h3>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-gray-700 hover:bg-gray-50"
              aria-label="Close sidebar"
            >
              Close
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 gap-5">
              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject
                </label>
                <textarea
                  value={params.subject}
                  onChange={(e) => handleInputChange('subject', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder:text-gray-400"
                  rows={3}
                  placeholder="Describe the main subject of your video..."
                />
              </div>

              {/* Action */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Action
                </label>
                <textarea
                  value={params.action}
                  onChange={(e) => handleInputChange('action', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder:text-gray-400"
                  rows={2}
                  placeholder="Describe what the subject is doing..."
                />
              </div>

              {/* Scene */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scene
                </label>
                <textarea
                  value={params.scene}
                  onChange={(e) => handleInputChange('scene', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder:text-gray-400"
                  rows={2}
                  placeholder="Describe the environment and setting..."
                />
              </div>

              {/* Camera Angle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Camera Angle
                </label>
                <select
                  value={params.cameraAngle}
                  onChange={(e) => handleInputChange('cameraAngle', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                >
                  {CAMERA_ANGLES.map(angle => (
                    <option key={angle} value={angle}>{angle}</option>
                  ))}
                </select>
              </div>

              {/* Camera Movement */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Camera Movement
                </label>
                <select
                  value={params.cameraMovement}
                  onChange={(e) => handleInputChange('cameraMovement', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                >
                  {CAMERA_MOVEMENTS.map(movement => (
                    <option key={movement} value={movement}>{movement}</option>
                  ))}
                </select>
              </div>

              {/* Lens Effects */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lens Effects
                </label>
                <select
                  value={params.lensEffects}
                  onChange={(e) => handleInputChange('lensEffects', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                >
                  {LENS_EFFECTS.map(effect => (
                    <option key={effect} value={effect}>{effect}</option>
                  ))}
                </select>
              </div>

              {/* Style */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Style
                </label>
                <select
                  value={params.style}
                  onChange={(e) => handleInputChange('style', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                >
                  {STYLES.map(style => (
                    <option key={style} value={style}>{style}</option>
                  ))}
                </select>
              </div>

              {/* Temporal Elements */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Temporal Elements
                </label>
                <select
                  value={params.temporalElements}
                  onChange={(e) => handleInputChange('temporalElements', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                >
                  {TEMPORAL_ELEMENTS.map(element => (
                    <option key={element} value={element}>{element}</option>
                  ))}
                </select>
              </div>

              {/* Sound Effects */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sound Effects
                </label>
                <select
                  value={params.soundEffects}
                  onChange={(e) => handleInputChange('soundEffects', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                >
                  {SOUND_EFFECTS.map(effect => (
                    <option key={effect} value={effect}>{effect}</option>
                  ))}
                </select>
              </div>

              {/* Dialogue */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dialogue
                </label>
                <textarea
                  value={params.dialogue}
                  onChange={(e) => handleInputChange('dialogue', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder:text-gray-400"
                  rows={2}
                  placeholder="Enter any dialogue or leave as 'None'"
                />
              </div>

              {/* Generate from sidebar */}
              <div className="pt-2">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-3 px-4 rounded-lg shadow-sm transition-colors duration-200 disabled:cursor-not-allowed"
                >
                  {isGenerating ? "Generating Video..." : "Generate Video (Cmd+Return)"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
