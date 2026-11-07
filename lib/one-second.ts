"use client";

/** Encode the first second of each input into one silent, playable clip. */
export async function makeOneSecondFilm(sources: string[], signal: AbortSignal): Promise<Blob> {
  if (!sources.length) throw new Error("Add a video first.");
  const canvas = document.createElement("canvas");
  if (typeof MediaRecorder === "undefined" || !canvas.captureStream) {
    throw new Error("Video editing is unavailable in this browser. Try Chrome or Safari on another device.");
  }

  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext("2d")!;
  const stream = canvas.captureStream(24);
  const mimeType = ["video/mp4", "video/webm;codecs=vp8", "video/webm"].find((type) => MediaRecorder.isTypeSupported(type));
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 900_000 } : undefined);
  const chunks: Blob[] = [];
  const done = new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = ({ data }) => { if (data.size) chunks.push(data); };
    recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || chunks[0]?.type }));
    recorder.onerror = () => reject(new Error("The video could not be encoded."));
  });
  void done.catch(() => undefined);

  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.crossOrigin = "anonymous";

  const load = (src: string) => new Promise<void>((resolve, reject) => {
    signal.throwIfAborted();
    const finish = (error?: Error) => {
      window.clearTimeout(timeout);
      signal.removeEventListener("abort", abort);
      video.onloadeddata = null;
      video.onerror = null;
      if (error) reject(error);
      else resolve();
    };
    const abort = () => finish(new Error("Video editing cancelled."));
    const timeout = window.setTimeout(() => finish(new Error("The video took too long to load.")), 15_000);
    signal.addEventListener("abort", abort, { once: true });
    video.onloadeddata = () => finish();
    video.onerror = () => finish(new Error("This video format couldn’t be opened."));
    video.src = src;
    video.load();
  });

  const draw = () => {
    const scale = Math.min(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
    const width = video.videoWidth * scale;
    const height = video.videoHeight * scale;
    ctx.fillStyle = "#14101f";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
  };

  try {
    for (const src of sources) {
      if (recorder.state === "recording") recorder.pause();
      await load(src);
      draw();
      await video.play();
      if (recorder.state === "inactive") recorder.start();
      else recorder.resume();

      const start = performance.now();
      await new Promise<void>((resolve, reject) => {
        const frame = () => {
          if (signal.aborted) { reject(new Error("Video editing cancelled.")); return; }
          try { draw(); } catch (error) { reject(error); return; }
          if (performance.now() - start >= 1000) resolve();
          else requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      });
      video.pause();
    }
    recorder.stop();
    const result = await done;
    if (!result.size) throw new Error("The browser produced an empty video.");
    return result;
  } finally {
    if (recorder.state !== "inactive") recorder.stop();
    stream.getTracks().forEach((track) => track.stop());
    video.pause();
    video.removeAttribute("src");
    video.load();
  }
}
