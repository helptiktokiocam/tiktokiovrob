import { toast, Toaster } from "solid-toast";
import { createSignal } from "solid-js";

// Interface matching the tik.json.ts response
interface TikTokData {
  success: boolean;
  data: {
    id: string;
    title: string;
    author: string;
    play: string;
    preview: string;
    cover: string;
  };
  error?: string;
  detail?: string;
}

type Props = {};

const InputScreen = (props: Props) => {
  const [url, setUrl] = createSignal("");
  const [data, setData] = createSignal<TikTokData | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal("");
  const [downloading, setDownloading] = createSignal("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    setData(null);

    try {
      // Validate URL format
      if (!url().match(/^https:\/\/(www\.)?tiktok\.com\/.+/)) {
        throw new Error("Invalid TikTok URL");
      }

      const res = await fetch("/api/tik.json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url() }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text.substring(0, 100)}`);
      }

      const contentType = res.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        const text = await res.text();
        throw new Error(`Expected JSON but got: ${text.substring(0, 100)}`);
      }

      const json: TikTokData = await res.json();

      if (!json.success) {
        throw new Error(json.error || "Failed to fetch video data");
      }

      setData(json);
      toast.success("Video data fetched successfully!", {
        duration: 3000,
        position: "bottom-center",
        style: {
          "font-size": "14px",
          "background-color": "#10b981",
          "color": "white",
        },
      });
    } catch (error: any) {
      console.error("Fetch error:", error.message);
      setError(error.message);
      toast.error(error.message, {
        duration: 5000,
        position: "bottom-center",
        style: { "font-size": "14px" },
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = async () => {
    try {
      const permission = await navigator.permissions.query({ name: "clipboard-read" as any });
      if (permission.state === "granted" || permission.state === "prompt") {
        const text = await navigator.clipboard.readText();
        setUrl(text);
        toast.success("URL pasted successfully!", {
          duration: 2000,
          position: "bottom-center",
        });
      }
    } catch {
      toast.error("Clipboard access denied", {
        duration: 3000,
        position: "bottom-center",
      });
    }
  };

  const downloadVideo = async (videoUrl: string, filename: string) => {
    if (!videoUrl) {
      toast.error("Video URL not available", {
        duration: 3000,
        position: "bottom-center",
      });
      return;
    }

    setDownloading("HD");

    try {
      // Fetch video from the proxied API endpoint
      console.log("Downloading from:", videoUrl);
      const response = await fetch(videoUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "video/mp4,*/*", // Accept broader content types
          Origin: window.location.origin,
        },
        body: JSON.stringify({ url: url() }),
      });

      console.log("Response status:", response.status, "Headers:", Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to fetch video: HTTP ${response.status} - ${text.substring(0, 100)}`);
      }

      // Convert response to blob
      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error("Received empty video file");
      }

      const downloadUrl = window.URL.createObjectURL(blob);

      // Create download link
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${filename}.mp4`;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      window.URL.revokeObjectURL(downloadUrl);

      toast.success("Video download started!", {
        duration: 3000,
        position: "bottom-center",
        style: {
          "background-color": "#10b981",
          "color": "white",
        },
      });
    } catch (error: any) {
      console.error("Download error:", error.message);
      toast.error(`Failed to download video: ${error.message}`, {
        duration: 5000,
        position: "bottom-center",
      });
    } finally {
      setDownloading("");
    }
  };

  return (
    <div class="max-w-6xl mx-auto mt-8 px-4">
      <Toaster />

      {/* Input Form Section */}
      <div class="max-w-6xl mx-auto">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchData();
          }}
          class="flex flex-col sm:flex-row gap-3"
        >
          <input
            type="text"
            value={url()}
            onInput={(e) => setUrl(e.currentTarget.value)}
            placeholder="Enter TikTok video URL"
            class="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white dark:border-gray-600"
            disabled={loading()}
          />
          <button
            type="button"
            onClick={handlePaste}
            class="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
            disabled={loading()}
          >
            Paste
          </button>
          <button
            type="submit"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
            disabled={loading()}
          >
            {loading() ? "Fetching..." : "Fetch Video"}
          </button>
        </form>

        {/* Error Display */}
        {error() && (
          <div class="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div class="flex items-start gap-3">
              <svg class="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clip-rule="evenodd"
                />
              </svg>
              <div class="text-sm text-red-700">
                <div class="font-semibold">Error occurred:</div>
                <div class="mt-1">{error()}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {loading() && (
        <div class="flex flex-col justify-center items-center mt-4">
          <svg class="animate-spin h-10 w-10 text-blue-600" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <p class="text-sm text-gray-600 mt-2">Fetching video...</p>
        </div>
      )}

      {data() && data()?.data && (
        <div class="mt-6">
          <div class="max-w-6xl mx-auto">
            <div class="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg overflow-hidden backdrop-blur-sm border border-white/10 p-4">
              <div class="flex flex-col md:flex-row gap-4">
                <div class="md:w-1/3 flex-shrink-0">
                  <div class="relative rounded-lg overflow-hidden max-h-[430px]">
                    {data()!.data.preview ? (
                      <video
                        controls
                        src={data()!.data.preview} // Use preview URL for playback
                        class="w-full h-full object-cover"
                        referrerpolicy="no-referrer"
                        crossorigin="anonymous"
                      >
                        Your browser does not support the video tag.
                      </video>
                    ) : (
                      <div class="w-full h-[300px] bg-gray-200 flex items-center justify-center rounded-lg">
                        <div class="text-center text-gray-500">
                          <svg class="w-16 h-16 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fill-rule="evenodd"
                              d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                              clip-rule="evenodd"
                            />
                          </svg>
                          <p>Video preview not available</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div class="md:w-2/3 flex flex-col justify-between">
                  <div class="mb-3">
                    <div class="flex items-center gap-3 justify-between mb-1">
                      <img
                        src={data()!.data.cover || "/default-avatar.png"}
                        alt={data()!.data.author || "User"}
                        class="rounded-full w-24 h-24 object-cover"
                        onError={(e) => {
                          e.currentTarget.src =
                            "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIGZpbGw9IiNmM2Y0ZjYiLz4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMCIgcj0iMyIgZmlsbD0iIzllYTNhOCIvPgo8cGF0aCBkPSJtNyAxOC4zYTUgNSAwIDAgMSAxMCAwIiBmaWxsPSIjOWVhM2E4Ii8+Cjwvc3ZnPg==";
                        }}
                      />
                      <h2 class="text-xl font-bold text-gray-900 dark:text-white">
                        {data()!.data.author || "Unknown User"}
                      </h2>
                    </div>
                    <div class="text-gray-400 text-xs mb-2">{data()!.data.title || "No description available"}</div>
                  </div>

                  <div class="space-y-2">
                    {data()!.data.play && (
                      <button
                        class={`w-full bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-500 hover:to-blue-300 text-white px-4 py-2 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 ${
                          downloading() === "HD" ? "opacity-75 cursor-not-allowed" : ""
                        }`}
                        onClick={() =>
                          downloadVideo(data()!.data.play, data()!.data.author || "tiktok_video")
                        }
                        disabled={downloading() === "HD"}
                      >
                        {downloading() === "HD" ? (
                          <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle
                              class="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              stroke-width="4"
                              fill="none"
                            />
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            ></path>
                          </svg>
                        )}
                        {downloading() === "HD" ? "Downloading..." : "Download Video (Without Watermark)"}
                      </button>
                    )}

                    <button
                      class="w-full bg-gradient-to-r from-gray-600 to-gray-400 hover:from-gray-500 hover:to-gray-300 text-white px-4 py-2 rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      <a href="/" class="flex items-center gap-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          class="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          ></path>
                        </svg>
                        Download Another Video
                      </a>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InputScreen;
