import React, { useRef, useState } from "react";

export interface VideoScene {
  imageUrl: string;
  duration: number;
  title?: string;
}

interface VideoRendererProps {
  scenes: VideoScene[];
}

const VideoRenderer: React.FC<VideoRendererProps> = ({ scenes }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const exportVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas || scenes.length === 0 || isRendering) return;

    setIsRendering(true);
    setProgress(0);

    try {
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");

      canvas.width = 1080;
      canvas.height = 1920;

      // LOAD ALL SCENE IMAGES
      const loadedImages = await Promise.all(
        scenes.map(
          (scene) =>
            new Promise<HTMLImageElement>((resolve, reject) => {
              const img = new Image();
              img.crossOrigin = "anonymous";

              img.onload = () => resolve(img);
              img.onerror = () =>
                reject(new Error("Failed to load scene image"));

              img.src = scene.imageUrl;
            })
        )
      );

      const totalDuration = scenes.reduce(
        (total, scene) => total + scene.duration,
        0
      );

      const transitionDuration = 0.8;

      const stream = canvas.captureStream(30);

      const recorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
      });

      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);

        setVideoUrl((previous) => {
          if (previous) URL.revokeObjectURL(previous);
          return url;
        });

        setIsRendering(false);
      };

      recorder.start();

      // DRAW IMAGE WITH CINEMATIC MOVEMENT
      const drawImageMotion = (
        img: HTMLImageElement,
        sceneProgress: number,
        sceneIndex: number
      ) => {
        const imageRatio = img.width / img.height;
        const canvasRatio = canvas.width / canvas.height;

        let baseWidth: number;
        let baseHeight: number;

        if (imageRatio > canvasRatio) {
          baseHeight = canvas.height;
          baseWidth = baseHeight * imageRatio;
        } else {
          baseWidth = canvas.width;
          baseHeight = baseWidth / imageRatio;
        }

        // ALTERNATING ZOOM
        const zoomIn = sceneIndex % 2 === 0;

        const scale = zoomIn
          ? 1.05 + sceneProgress * 0.12
          : 1.17 - sceneProgress * 0.12;

        const width = baseWidth * scale;
        const height = baseHeight * scale;

        // SUBTLE PAN
        const panDirection = sceneIndex % 4;

        let panX = 0;
        let panY = 0;

        if (panDirection === 0) {
          panX = -sceneProgress * canvas.width * 0.025;
        } else if (panDirection === 1) {
          panX = sceneProgress * canvas.width * 0.025;
        } else if (panDirection === 2) {
          panY = -sceneProgress * canvas.height * 0.025;
        } else {
          panY = sceneProgress * canvas.height * 0.025;
        }

        const x = (canvas.width - width) / 2 + panX;
        const y = (canvas.height - height) / 2 + panY;

        ctx.drawImage(img, x, y, width, height);
      };

      let elapsed = 0;

      // RENDER EACH SCENE
      for (let i = 0; i < scenes.length; i++) {
        const sceneDuration = scenes[i].duration;
        const img = loadedImages[i];

        const startTime = performance.now();
        const durationMs = sceneDuration * 1000;

        await new Promise<void>((resolve) => {
          const animate = (now: number) => {
            const sceneProgress = Math.min(
              (now - startTime) / durationMs,
              1
            );

            ctx.fillStyle = "#000";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // PREVIOUS SCENE UNDERNEATH DURING TRANSITION
            if (i > 0 && sceneProgress < transitionDuration / sceneDuration) {
              const transitionProgress = Math.min(
                sceneProgress / (transitionDuration / sceneDuration),
                1
              );

              drawImageMotion(
                loadedImages[i - 1],
                1,
                i - 1
              );

              // FADE IN CURRENT SCENE
              ctx.save();
              ctx.globalAlpha = transitionProgress;

              drawImageMotion(img, sceneProgress, i);

              ctx.restore();
            } else {
              drawImageMotion(img, sceneProgress, i);
            }

            // RENDER PROGRESS
            setProgress(
              Math.min(
                Math.round(
                  ((elapsed + sceneProgress * sceneDuration) /
                    totalDuration) *
                    100
                ),
                100
              )
            );

            if (sceneProgress < 1) {
              requestAnimationFrame(animate);
            } else {
              elapsed += sceneDuration;
              resolve();
            }
          };

          requestAnimationFrame(animate);
        });
      }

      recorder.stop();
    } catch (error) {
      console.error("Video export failed:", error);
      alert("Video rendering failed. Check the console for details.");
      setIsRendering(false);
    }
  };

  // DOWNLOAD VIDEO
  const downloadVideo = () => {
    if (!videoUrl) return;

    const link = document.createElement("a");
    link.href = videoUrl;
    link.download = "clipforge-video.webm";
    link.click();
  };

  return (
    <div className="video-renderer">
      <div className="video-renderer-header">
        <h2>Video Production</h2>
        <p>Turn your generated scenes into a video.</p>
      </div>

      <canvas
        ref={canvasRef}
        style={{
          display: "none",
        }}
      />

      <div className="video-renderer-controls">
        <button
          onClick={exportVideo}
          disabled={isRendering || scenes.length === 0}
        >
          {isRendering ? "Rendering Video..." : "Render Video"}
        </button>

        {isRendering && (
          <div className="render-progress">
            <div className="render-progress-bar">
              <div
                className="render-progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>

            <p>{progress}% completed</p>
          </div>
        )}

        {videoUrl && !isRendering && (
          <div className="video-renderer-result">
            <h3>Video Ready</h3>

            <video
              src={videoUrl}
              controls
              playsInline
              style={{
                width: "100%",
                maxWidth: "400px",
                borderRadius: "12px",
              }}
            />

            <button onClick={downloadVideo}>
              Download Video
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoRenderer;