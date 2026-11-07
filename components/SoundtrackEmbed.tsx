"use client";

import { useEffect, useRef, useState } from "react";

type SpotifyController = {
  play: () => void;
  destroy: () => void;
  addListener: (event: "ready", listener: () => void) => void;
};
type SpotifyApi = {
  createController: (
    target: HTMLElement,
    options: { uri: string; width: string; height: number },
    callback: (controller: SpotifyController) => void
  ) => void;
};

let spotifyApi: Promise<SpotifyApi> | undefined;

function loadSpotify() {
  spotifyApi ??= new Promise<SpotifyApi>((resolve, reject) => {
    const spotifyWindow = window as Window & { onSpotifyIframeApiReady?: (api: SpotifyApi) => void };
    const script = document.createElement("script");
    script.src = "https://open.spotify.com/embed/iframe-api/v1";
    spotifyWindow.onSpotifyIframeApiReady = resolve;
    script.onerror = () => {
      script.remove();
      spotifyApi = undefined;
      reject(new Error("Spotify couldn’t load."));
    };
    document.head.appendChild(script);
  });
  return spotifyApi;
}

export function SoundtrackEmbed({ url, title }: { url: string; title: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const isSpotify = url.startsWith("https://open.spotify.com/");
  const uri = isSpotify ? "spotify:" + new URL(url).pathname.replace(/^\/embed\//, "").replace("/", ":") : null;

  useEffect(() => {
    const host = container.current;
    if (!host || !uri) return;
    const slot = document.createElement("div");
    host.appendChild(slot);
    let active = true;
    let controller: SpotifyController | undefined;

    void loadSpotify().then((api) => {
      if (!active) return;
      api.createController(slot, { uri, width: "100%", height: 152 }, (player) => {
        if (!active) { player.destroy(); return; }
        controller = player;
        player.addListener("ready", () => { if (active) player.play(); });
      });
    }).catch(() => { if (active) setFailed(true); });

    return () => {
      active = false;
      controller?.destroy();
      host.replaceChildren();
    };
  }, [uri]);

  if (isSpotify && !failed) return <div ref={container} className="min-h-[152px] overflow-hidden rounded-lg" />;
  return (
    <iframe
      title={`Player for ${title}`}
      src={url + (isSpotify ? "" : "?autoplay=1")}
      className={`w-full rounded-lg border-0 ${isSpotify ? "h-[152px]" : "h-[200px]"}`}
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
    />
  );
}
