
import { useState, type FormEvent } from "react";
import JSZip from "jszip";
import "./AIStudio.css";
import VideoRenderer from "./VideoRenderer";
const API_URL = "http://127.0.0.1:8000";

interface Scene {
  scene_number: number;
  title: string;
  start_time: string;
  end_time: string;
  duration: number;
  voiceover: string;
  visual_description: string;
  image_prompt: string;
  camera_movement: string;
  audio_effects: string;
}

interface SceneResponse {
  success: boolean;
  model: string;
  title: string;
  total_duration: string;
  aspect_ratio: string;
  scenes: Scene[];
}

function AIStudio() {
  const [topic, setTopic] = useState("");
  const [contentType, setContentType] = useState("Educational");
  const [duration, setDuration] = useState("60 seconds");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [visualStyle, setVisualStyle] = useState("Cinematic Realism");
  const [customVisualStyle, setCustomVisualStyle] = useState("");
  const [language, setLanguage] = useState("English");
  const [voice, setVoice] = useState("Female");
  const [tone, setTone] = useState("Cinematic");
  const [subtitles, setSubtitles] = useState(true);

  const [loading, setLoading] = useState(false);
  const [generatedScript, setGeneratedScript] = useState("");
  const [scriptDraft, setScriptDraft] = useState("");
  const [generatedModel, setGeneratedModel] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const [sceneLoading, setSceneLoading] = useState(false);
  const [sceneData, setSceneData] = useState<SceneResponse | null>(null);

  // ComfyUI image generation states
  const [generatedImages, setGeneratedImages] = useState<
    Record<number, string>
  >({});

  const [imageLoading, setImageLoading] = useState<
    Record<number, boolean>
  >({});

  const [imageErrors, setImageErrors] = useState<
    Record<number, string>
  >({});

  const [zipLoading, setZipLoading] = useState(false);
  const [zipMessage, setZipMessage] = useState("");

  const [error, setError] = useState("");
  const [sceneError, setSceneError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  // GENERATE VIDEO SCRIPT
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!topic.trim()) {
      setError("Please enter a video topic.");
      return;
    }

    setLoading(true);
    setError("");
    setSceneError("");
    setGeneratedScript("");
    setScriptDraft("");
    setGeneratedModel("");
    setSceneData(null);
    setGeneratedImages({});
    setImageLoading({});
    setImageErrors({});
    setCopyMessage("");
    setIsEditing(false);

    try {
      const response = await fetch(`${API_URL}/api/generate-script`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic: topic.trim(),
          content_type: contentType,
          duration,
          language,
          tone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to generate video script.");
      }

      if (!data.success || !data.script) {
        throw new Error("Gemini returned an empty script.");
      }

      setGeneratedScript(data.script);
      setScriptDraft(data.script);
      setGeneratedModel(data.model || "Gemini");
    } catch (err) {
      console.error("Script generation error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // GENERATE SCENES
  async function handleGenerateScenes() {
    if (!generatedScript.trim()) {
      setSceneError("Generate a script before generating scenes.");
      return;
    }

    setSceneLoading(true);
    setSceneError("");
    setSceneData(null);
    setGeneratedImages({});
    setImageLoading({});
    setImageErrors({});

    try {
      const response = await fetch(`${API_URL}/api/generate-scenes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          script: generatedScript,
          duration,
          aspect_ratio: aspectRatio,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to generate scenes.");
      }

      if (!data.success || !Array.isArray(data.scenes) || !data.scenes.length) {
        throw new Error("Gemini did not return a valid scene breakdown.");
      }

      setSceneData(data);
    } catch (err) {
      console.error("Scene generation error:", err);

      setSceneError(
        err instanceof Error
          ? err.message
          : "Something went wrong while generating scenes."
      );
    } finally {
      setSceneLoading(false);
    }
  }

  // GENERATE IMAGE FOR INDIVIDUAL SCENE
  async function handleGenerateSceneImage(scene: Scene) {
    const sceneNumber = scene.scene_number;

    if (visualStyle === "Custom" && !customVisualStyle.trim()) {
      setImageErrors((previous) => ({
        ...previous,
        [sceneNumber]: "Enter a custom visual style before generating the image.",
      }));
      return;
    }

    setImageLoading((previous) => ({
      ...previous,
      [sceneNumber]: true,
    }));

    setImageErrors((previous) => ({
      ...previous,
      [sceneNumber]: "",
    }));

    try {
      const response = await fetch(`${API_URL}/api/generate-image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: `${
            visualStyle === "Custom"
              ? customVisualStyle.trim()
              : visualStyle === "Cinematic Realism"
              ? "Cinematic photorealistic visual style, realistic lighting, natural textures, film-quality composition."
              : visualStyle === "3D Animation"
              ? "High-quality stylized 3D animation, polished 3D rendering, expressive forms, cohesive animated-film aesthetic."
              : visualStyle === "Documentary"
              ? "Documentary photography style, authentic and natural, grounded realism, observational visual storytelling."
              : visualStyle === "Anime"
              ? "Consistent anime art style, clean linework, expressive anime composition, detailed backgrounds."
              : "Futuristic sci-fi visual style, advanced technology, cinematic atmosphere, cohesive science-fiction design."
          }\n\n${scene.image_prompt || scene.visual_description}`,
          negative_prompt:
            "blurry, low quality, distorted, bad anatomy, watermark, text, logo",

          width:
            aspectRatio === "9:16"
              ? 512
              : aspectRatio === "16:9"
              ? 896
              : 512,

          height:
            aspectRatio === "9:16"
              ? 896
              : aspectRatio === "16:9"
              ? 512
              : 512,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Image generation failed.");
      }

      if (!data.success || !data.image_url) {
        throw new Error("ComfyUI did not return an image URL.");
      }

      setGeneratedImages((previous) => ({
        ...previous,
        [sceneNumber]: data.image_url,
      }));
    } catch (err) {
      console.error(`Scene ${sceneNumber} image error:`, err);

      setImageErrors((previous) => ({
        ...previous,
        [sceneNumber]:
          err instanceof Error
            ? err.message
            : "Something went wrong while generating the image.",
      }));
    } finally {
      setImageLoading((previous) => ({
        ...previous,
        [sceneNumber]: false,
      }));
    }
  }

  // DOWNLOAD ALL GENERATED SCENE IMAGES AS ZIP
  async function handleDownloadImagesZip() {
    const imageEntries = Object.entries(generatedImages);

    if (!imageEntries.length) {
      setZipMessage("Generate at least one scene image before downloading.");
      return;
    }

    setZipLoading(true);
    setZipMessage("");

    try {
      const zip = new JSZip();

      await Promise.all(
        imageEntries.map(async ([sceneNumber, imageUrl]) => {
          const response = await fetch(imageUrl);

          if (!response.ok) {
            throw new Error(`Could not fetch Scene ${sceneNumber} image.`);
          }

          const blob = await response.blob();
          const extension = blob.type.includes("jpeg") ? "jpg" : "png";
          const scene = sceneData?.scenes.find(
            (item) => item.scene_number === Number(sceneNumber)
          );
          const safeTitle = (scene?.title || "scene")
            .replace(/[^a-z0-9-_]/gi, "_")
            .replace(/_+/g, "_")
            .slice(0, 40);

          zip.file(
            `Scene_${String(sceneNumber).padStart(2, "0")}_${safeTitle}.${extension}`,
            blob
          );
        })
      );

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const downloadUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");

      link.href = downloadUrl;
      link.download = "ClipForge_AI_Scene_Images.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(downloadUrl);
      setZipMessage("ZIP download started successfully.");
    } catch (err) {
      console.error("ZIP download error:", err);
      setZipMessage(
        err instanceof Error
          ? err.message
          : "Unable to package scene images."
      );
    } finally {
      setZipLoading(false);
    }
  }

  // SCRIPT EDITING
  function handleStartEditing() {
    setScriptDraft(generatedScript);
    setIsEditing(true);
  }

  function handleSaveScript() {
    if (!scriptDraft.trim()) {
      setError("The script cannot be empty.");
      return;
    }

    setGeneratedScript(scriptDraft);
    setIsEditing(false);
    setSceneData(null);
    setGeneratedImages({});
    setImageLoading({});
    setImageErrors({});
    setSceneError("");
    setCopyMessage(
      "Script updated successfully. Generate scenes again to use the updated script."
    );
  }

  function handleCancelEditing() {
    setScriptDraft(generatedScript);
    setIsEditing(false);
  }

  // COPY SCRIPT
  async function handleCopyScript() {
    try {
      await navigator.clipboard.writeText(generatedScript);
      setCopyMessage("Script copied successfully!");
    } catch {
      setCopyMessage(
        "Unable to copy automatically. Please select and copy the script."
      );
    }
  }

  // DOWNLOAD SCRIPT
  function handleDownloadScript() {
    const blob = new Blob([generatedScript], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "ClipForge_AI_Script.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
    setCopyMessage("Script download started.");
  }

  // RESET WORKSPACE
  function handleReset() {
    setGeneratedScript("");
    setScriptDraft("");
    setGeneratedModel("");
    setSceneData(null);
    setGeneratedImages({});
    setImageLoading({});
    setImageErrors({});
    setError("");
    setSceneError("");
    setCopyMessage("");
    setZipMessage("");
    setIsEditing(false);
  }

  return (
    <div className="studio-container">
      {/* HEADER */}
      <div className="studio-heading">
        <div>
          <span className="studio-eyebrow">AI VIDEO WORKSPACE</span>

          <h1>
            Create your next <span>video.</span>
          </h1>

          <p>Turn your ideas into engaging AI-powered content.</p>
        </div>

        <div className="studio-badge">✦ AI STUDIO</div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="studio-grid">
          {/* LEFT: VIDEO CONFIGURATION */}
          <div className="studio-main">
            {/* SECTION 01 */}
            <section className="studio-card">
              <div className="studio-card-heading">
                <div>
                  <span className="studio-step">01</span>
                  <h2>What should we create?</h2>
                  <p>Describe the video you want to generate.</p>
                </div>
              </div>

              <label htmlFor="video-topic">Video topic or prompt</label>

              <textarea
                id="video-topic"
                className="topic-input"
                placeholder="Example: Explain how artificial intelligence will transform the world in the next 10 years..."
                value={topic}
                onChange={(e) => {
                  setTopic(e.target.value);
                  setError("");
                }}
                rows={5}
                maxLength={2000}
                required
              />

              <div className="input-footer">
                <span>Be descriptive for better results.</span>
                <span>{topic.length}/2000 characters</span>
              </div>
            </section>

            {/* SECTION 02 */}
            <section className="studio-card">
              <div className="studio-card-heading">
                <div>
                  <span className="studio-step">02</span>
                  <h2>Content category</h2>
                  <p>Choose the type of video you want.</p>
                </div>
              </div>

              <div className="content-type-grid">
                {[
                  ["Educational", "📚"],
                  ["Podcast Clips", "🎙️"],
                  ["Facts", "💡"],
                  ["Storytelling", "📖"],
                  ["Motivation", "🔥"],
                  ["News Explainer", "📰"],
                  ["Product Promo", "🛍️"],
                  ["Entertainment", "🎬"],
                  ["Custom", "✦"],
                ].map(([name, icon]) => (
                  <button
                    type="button"
                    key={name}
                    className={`content-option ${
                      contentType === name ? "selected" : ""
                    }`}
                    onClick={() => setContentType(name)}
                  >
                    <span>{icon}</span>
                    {name}
                  </button>
                ))}
              </div>
            </section>

            {/* SECTION 03 */}
            <section className="studio-card">
              <div className="studio-card-heading">
                <div>
                  <span className="studio-step">03</span>
                  <h2>Video settings</h2>
                  <p>Customize the output of your video.</p>
                </div>
              </div>

              <div className="settings-grid">
                <div className="setting-field">
                  <label htmlFor="duration">Video duration</label>
                  <select
                    id="duration"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  >
                    <option>30 seconds</option>
                    <option>60 seconds</option>
                    <option>3 minutes</option>
                    <option>5 minutes</option>
                  </select>
                </div>

                <div className="setting-field">
                  <label htmlFor="language">Language</label>
                  <select
                    id="language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    <option>English</option>
                    <option>Malayalam</option>
                    <option>Hindi</option>
                    <option>Tamil</option>
                    <option>Spanish</option>
                  </select>
                </div>

                <div className="setting-field">
                  <label htmlFor="voice">Voiceover</label>
                  <select
                    id="voice"
                    value={voice}
                    onChange={(e) => setVoice(e.target.value)}
                  >
                    <option>Female</option>
                    <option>Male</option>
                    <option>No voice</option>
                  </select>
                </div>

                <div className="setting-field">
                  <label htmlFor="tone">Video tone</label>
                  <select
                    id="tone"
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                  >
                    <option>Cinematic</option>
                    <option>Professional</option>
                    <option>Educational</option>
                    <option>Entertaining</option>
                    <option>Dramatic</option>
                  </select>
                </div>
              </div>

              {/* VISUAL STYLE */}
              <div className="setting-field visual-style-field">
                <label htmlFor="visual-style">Visual style (applies to every scene image)</label>
                <select
                  id="visual-style"
                  value={visualStyle}
                  onChange={(e) => setVisualStyle(e.target.value)}
                >
                  <option>Cinematic Realism</option>
                  <option>3D Animation</option>
                  <option>Documentary</option>
                  <option>Anime</option>
                  <option>Sci-Fi</option>
                  <option>Custom</option>
                </select>
                {visualStyle === "Custom" && (
                  <textarea
                    className="topic-input"
                    placeholder="Describe the visual style you want applied consistently to every scene..."
                    value={customVisualStyle}
                    onChange={(e) => setCustomVisualStyle(e.target.value)}
                    rows={3}
                  />
                )}
                <small>Selected style is added to the image prompt whenever a scene image is generated or regenerated.</small>
              </div>

              {/* ASPECT RATIO */}
              <div className="ratio-section">
                <label>Aspect ratio</label>

                <div className="ratio-options">
                  {["9:16", "16:9", "1:1"].map((ratio) => (
                    <button
                      type="button"
                      key={ratio}
                      className={`ratio-option ${
                        aspectRatio === ratio ? "selected" : ""
                      }`}
                      onClick={() => setAspectRatio(ratio)}
                    >
                      <span
                        className={`ratio-shape ratio-${ratio.replace(
                          ":",
                          "-"
                        )}`}
                      />

                      <strong>{ratio}</strong>

                      <small>
                        {ratio === "9:16"
                          ? "Shorts / Reels"
                          : ratio === "16:9"
                          ? "YouTube"
                          : "Square"}
                      </small>
                    </button>
                  ))}
                </div>
              </div>

              {/* SUBTITLES */}
              <div className="subtitle-setting">
                <div>
                  <strong>Automatic subtitles</strong>
                  <p>Include captions in the generated video.</p>
                </div>

                <input
                  type="checkbox"
                  checked={subtitles}
                  onChange={(e) => setSubtitles(e.target.checked)}
                />
              </div>
            </section>

            {/* GENERATE SCRIPT BUTTON */}
            <button
              type="submit"
              className="generate-button"
              disabled={!topic.trim() || loading}
            >
              {loading ? (
                <>
                  <span className="loading-spinner" />
                  Generating your script...
                </>
              ) : (
                <>
                  ✦ Generate AI Script
                  <span>→</span>
                </>
              )}
            </button>
          </div>

          {/* RIGHT: PREVIEW */}
          <aside className="studio-sidebar">
            <section className="preview-card">
              <div className="preview-heading">
                <h2>Video Preview</h2>
                <span>LIVE SETTINGS</span>
              </div>

              <div className="video-placeholder">
                <div className="preview-play">▶</div>
                <span>Your video preview</span>
                <small>Video preview will appear after rendering.</small>
              </div>

              <div className="preview-details">
                <div>
                  <span>Category</span>
                  <strong>{contentType}</strong>
                </div>

                <div>
                  <span>Duration</span>
                  <strong>{duration}</strong>
                </div>

                <div>
                  <span>Aspect ratio</span>
                  <strong>{aspectRatio}</strong>
                </div>

                <div>
                  <span>Language</span>
                  <strong>{language}</strong>
                </div>

                <div>
                  <span>Voiceover</span>
                  <strong>{voice}</strong>
                </div>

                <div>
                  <span>Tone</span>
                  <strong>{tone}</strong>
                </div>
                <div>
                  <span>Visual style</span>
                  <strong>{visualStyle === "Custom" ? (customVisualStyle || "Custom") : visualStyle}</strong>
                </div>

                <div>
                  <span>Subtitles</span>
                  <strong>{subtitles ? "Enabled" : "Disabled"}</strong>
                </div>
              </div>
            </section>

            <section className="studio-info">
              <span>✦ CLIPFORGE AI</span>
              <h3>Your creative workspace.</h3>
              <p>
                Configure your content once. Gemini generates your script,
                while production modules handle narration, visuals and video
                rendering.
              </p>
            </section>
          </aside>
        </div>
      </form>

      {/* SCRIPT ERROR */}
      {error && (
        <div className="generation-error">
          <div>
            <strong>⚠ Script generation failed</strong>
            <p>{error}</p>
          </div>

          <button type="button" onClick={() => setError("")}>
            Dismiss
          </button>
        </div>
      )}

      {/* GENERATED SCRIPT */}
      {generatedScript && (
        <section className="generated-result">
          <div className="result-header">
            <div>
              <span className="studio-eyebrow">GEMINI AI OUTPUT</span>
              <h2>Your generated video script</h2>
              <p>Successfully generated using {generatedModel}.</p>
            </div>

            <span className="result-status">✓ GENERATED</span>
          </div>

          <div className="result-toolbar">
            <span>AI GENERATED SCRIPT</span>

            <div className="result-actions">
              {!isEditing && (
                <>
                  <button type="button" onClick={handleStartEditing}>
                    ✎ Edit Script
                  </button>

                  <button type="button" onClick={handleCopyScript}>
                    ▣ Copy Script
                  </button>

                  <button type="button" onClick={handleDownloadScript}>
                    ↓ Download
                  </button>
                </>
              )}

              <button type="button" onClick={handleReset}>
                ✕ Clear
              </button>
            </div>
          </div>

          {isEditing ? (
            <div className="generated-script-editor">
              <textarea
                value={scriptDraft}
                onChange={(e) => setScriptDraft(e.target.value)}
                rows={18}
              />

              <div className="result-actions">
                <button type="button" onClick={handleSaveScript}>
                  ✓ Save Changes
                </button>

                <button type="button" onClick={handleCancelEditing}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <pre className="generated-script">{generatedScript}</pre>
          )}

          {copyMessage && <p className="copy-message">{copyMessage}</p>}

          <div className="result-footer">
            <span>Powered by Google Gemini · ClipForge AI</span>
          </div>

          {/* GENERATE SCENES */}
          {!isEditing && (
            <div className="scene-generation-action">
              <div>
                <span className="studio-eyebrow">NEXT PRODUCTION STEP</span>
                <h3>Turn your script into scenes</h3>
                <p>
                  Generate cinematic scenes, narration segments and visual
                  prompts from your script.
                </p>
              </div>

              <button
                type="button"
                className="generate-scenes-button"
                onClick={handleGenerateScenes}
                disabled={sceneLoading}
              >
                {sceneLoading ? (
                  <>
                    <span className="loading-spinner" />
                    Generating scenes...
                  </>
                ) : (
                  <>✦ Generate Scenes →</>
                )}
              </button>
            </div>
          )}
        </section>
      )}

      {/* SCENE ERROR */}
      {sceneError && (
        <div className="generation-error">
          <div>
            <strong>⚠ Scene generation failed</strong>
            <p>{sceneError}</p>
          </div>

          <button type="button" onClick={() => setSceneError("")}>
            Dismiss
          </button>
        </div>
      )}

      {/* GENERATED SCENES */}
      {sceneData && (
        <>
        <section className="scene-results">
          <div className="scene-results-header">
            <div>
              <span className="studio-eyebrow">CLIPFORGE AI PRODUCTION</span>
              <h2>{sceneData.title || "Your scene breakdown"}</h2>
              <p>
                {sceneData.scenes.length} scenes · {sceneData.total_duration} ·{" "}
                {sceneData.aspect_ratio}
              </p>
            </div>

            <span className="result-status">✓ SCENES GENERATED</span>
          </div>

          <div className="scene-download-actions">
            <button
              type="button"
              className="generate-scenes-button"
              onClick={handleDownloadImagesZip}
              disabled={zipLoading || Object.keys(generatedImages).length === 0}
            >
              {zipLoading ? (
                <>
                  <span className="loading-spinner" />
                  Packaging images...
                </>
              ) : (
                <>↓ Download Generated Images (ZIP)</>
              )}
            </button>
            {zipMessage && <p className="copy-message">{zipMessage}</p>}
          </div>

          <div className="scene-list">
            {sceneData.scenes.map((scene) => (
              <article className="scene-card" key={scene.scene_number}>
                <div className="scene-card-header">
                  <div className="scene-number">
                    SCENE {String(scene.scene_number).padStart(2, "0")}
                  </div>

                  <span className="scene-timestamp">
                    {scene.start_time} – {scene.end_time}
                  </span>
                </div>

                <h3>{scene.title}</h3>

                <div className="scene-duration">
                  {scene.duration} seconds
                </div>

                <div className="scene-detail">
                  <span>VOICEOVER</span>
                  <p>{scene.voiceover}</p>
                </div>

                <div className="scene-detail">
                  <span>VISUAL DESCRIPTION</span>
                  <p>{scene.visual_description}</p>
                </div>

                <div className="scene-detail">
                  <span>AI IMAGE PROMPT</span>
                  <p>{scene.image_prompt}</p>
                </div>

                <div className="scene-detail">
                  <span>CAMERA MOVEMENT</span>
                  <p>{scene.camera_movement}</p>
                </div>

                <div className="scene-detail">
                  <span>AUDIO & EFFECTS</span>
                  <p>{scene.audio_effects}</p>
                </div>

                {/* GENERATED SCENE IMAGE */}
                {generatedImages[scene.scene_number] && (
                  <div className="scene-image-container">
                    <span className="scene-image-label">
                      GENERATED VISUAL
                    </span>

                    <img
                      src={generatedImages[scene.scene_number]}
                      alt={`Generated visual for ${scene.title}`}
                      className="scene-generated-image"
                    />
                  </div>
                )}

                {/* IMAGE GENERATION ERROR */}
                {imageErrors[scene.scene_number] && (
                  <div className="scene-image-error">
                    {imageErrors[scene.scene_number]}
                  </div>
                )}

                {/* GENERATE IMAGE BUTTON */}
                <button
                  type="button"
                  className="generate-image-button"
                  onClick={() => handleGenerateSceneImage(scene)}
                  disabled={imageLoading[scene.scene_number]}
                >
                  {imageLoading[scene.scene_number] ? (
                    <>
                      <span className="loading-spinner" />
                      Generating image...
                    </>
                  ) : generatedImages[scene.scene_number] ? (
                    <>↻ Regenerate Image</>
                  ) : (
                    <>✦ Generate Scene Image</>
                  )}
                </button>

                {/* COPY IMAGE PROMPT */}
                <button
                  type="button"
                  className="copy-prompt-button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(scene.image_prompt);
                      setCopyMessage(
                        `Image prompt for Scene ${scene.scene_number} copied!`
                      );
                    } catch {
                      setCopyMessage("Unable to copy the image prompt.");
                    }
                  }}
                >
                  ▣ Copy Image Prompt
                </button>
              </article>
            ))}
          </div>

          <div className="scene-results-footer">
            <span>
              Generated by {sceneData.model || "Gemini"} · ClipForge AI
            </span>

            <button
              type="button"
              onClick={handleGenerateScenes}
              disabled={sceneLoading}
            >
              ↻ Regenerate Scenes
            </button>
          </div>
        </section>
        <VideoRenderer
          scenes={sceneData.scenes
            .filter((scene) => generatedImages[scene.scene_number])
            .map((scene) => ({
              imageUrl: generatedImages[scene.scene_number],
              duration: scene.duration,
              title: scene.title,
            }))}
        />
        </>
      )}
    </div>
  );
}

export default AIStudio;
