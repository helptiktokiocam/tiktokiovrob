import { toast, Toaster } from "solid-toast";
import { createSignal, onMount, onCleanup } from "solid-js";

// Updated interface to match the actual API response
interface TikTokData {
  status: "success" | "error";
  message?: string;
  result?: {
    type: "video" | "image";
    desc?: string;
    author?: {
      avatar?: string;
      nickname?: string;
    };
    music?: string;
    images?: string[];
    videoHD?: string;
    videoWatermark?: string;
    uploadDate?: string;
  };
}

type Props = {};

function InputScreen({}: Props) {
  const [url, setUrl] = createSignal("");
  const [data, setData] = createSignal<TikTokData | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal("");
  const [downloading, setDownloading] = createSignal("");

  const fetchData = async () => {
    setLoading(true);
    try {
      let res = await fetch(`/api/tik.json?url=${encodeURIComponent(url())}`);
      let json = await res.json();
      
      if (json.status === "error") {
        throw new Error(json.message || "Failed to fetch video data");
      }
      
      setData(json ?? null);
      // Initialize AdSense ads after data is loaded
      initializeAdSense();
      setError("");
    } catch (error: any) {
      toast.error(error.message, {
        duration: 3000,
        position: "bottom-center",
        style: {
          "font-size": "16px",
        },
      });
      setData(null);
    }
    setLoading(false);
  };

  const handlePaste = async () => {
    try {
      const permission = await navigator.permissions.query({ name: 'clipboard-read' as any });
      if (permission.state === 'granted' || permission.state === 'prompt') {
        const text = await navigator.clipboard.readText();
        setUrl(text);
      }
    } catch (err) {
      toast.error("Clipboard access denied");
    }
  };

  // Initialize Google AdSense
  const initializeAdSense = () => {
    // Check if AdSense script is already loaded
    if (!document.getElementById("adsense-script")) {
      const script = document.createElement("script");
      script.id = "adsense-script";
      script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4342939946293194";
      script.crossOrigin = "anonymous";
      script.async = true;
      document.head.appendChild(script);
      
      script.onload = () => {
        // Initialize ads after script loads
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {
          console.error("AdSense initialization error:", e);
        }
      };
    } else {
      // Script already loaded, just push ads
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.error("AdSense push error:", e);
      }
    }
  };

  // Enhanced download function with external service and fallbacks
  const downloadVideo = async (videoUrl: string, filename: string, quality: string) => {
    if (!videoUrl) {
      toast.error("Video URL not available");
      return;
    }

    setDownloading(quality);
    
    try {
      // Method 1: Try external download service first
      const externalServiceUrl = `https://dl.vid3konline.workers.dev/api/download?url=${encodeURIComponent(videoUrl)}&type=.mp4&title=${encodeURIComponent(filename)}_${quality}`;
      
      // Test if the external service is working
      const testResponse = await fetch(externalServiceUrl, {
        method: 'HEAD',
        timeout: 5000
      }).catch(() => null);

      if (testResponse && testResponse.ok) {
        // External service is working, use it
        const link = document.createElement('a');
        link.href = externalServiceUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success(`${quality} video download started!`, {
          duration: 2000,
          position: "bottom-center"
        });
      } else {
        throw new Error("External service unavailable");
      }
    } catch (error) {
      console.log("External service failed, trying direct download...");
      
      try {
        // Method 2: Direct download fallback
        const response = await fetch(videoUrl, {
          mode: 'cors',
          headers: {
            'Accept': 'video/mp4,video/*,*/*'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `${filename}_${quality}.mp4`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the blob URL
        window.URL.revokeObjectURL(downloadUrl);
        
        toast.success(`${quality} video downloaded successfully!`, {
          duration: 2000,
          position: "bottom-center"
        });
      } catch (directError) {
        console.error("Direct download failed:", directError);
        
        // Method 3: Open in new tab as last resort
        const link = document.createElement('a');
        link.href = videoUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.error("Download service unavailable. Video opened in new tab - you can save it manually.", {
          duration: 4000,
          position: "bottom-center"
        });
      }
    } finally {
      setDownloading("");
    }
  };

  // Enhanced download function for audio
  const downloadAudio = async (audioUrl: string, filename: string) => {
    if (!audioUrl) {
      toast.error("Audio URL not available");
      return;
    }

    setDownloading("Audio");
    
    try {
      // Try external service for audio
      const externalServiceUrl = `https://dl.tiktokiocdn.workers.dev/api/download?url=${encodeURIComponent(audioUrl)}&type=.mp3&title=${encodeURIComponent(filename)}_audio`;
      
      const testResponse = await fetch(externalServiceUrl, {
        method: 'HEAD',
        timeout: 5000
      }).catch(() => null);

      if (testResponse && testResponse.ok) {
        const link = document.createElement('a');
        link.href = externalServiceUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success("Audio download started!", {
          duration: 2000,
          position: "bottom-center"
        });
      } else {
        // Fallback for audio
        const link = document.createElement('a');
        link.href = audioUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.error("Audio download service unavailable. Audio opened in new tab.", {
          duration: 3000,
          position: "bottom-center"
        });
      }
    } catch (error) {
      console.error("Audio download failed:", error);
      toast.error("Failed to download audio");
    } finally {
      setDownloading("");
    }
  };

  onCleanup(() => {
    const script = document.getElementById("adsense-script");
    if (script) script.remove();
  });

  return (
    <div class="max-w-6xl mx-auto mt-8 px-4">
      <Toaster />

      {/* Input Form Section */}
      <div class="max-w-6xl mx-auto">
        <div class="download-box rounded-2xl">
          <div class="bg-cyan-800/80 rounded-xl backdrop-blur-md p-4">
            <form class="flex flex-col md:flex-row items-stretch md:items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!url()) {
                  toast.error("Please enter a valid URL");
                } else {
                  fetchData();
                }
              }}
            >
              <div class="relative flex-grow bg-white rounded">
                <input type="text"
                  value={url()}
                  onInput={(e) => setUrl(e.currentTarget.value)}
                  placeholder="Paste TikTok video link here"
                  class="w-full h-14 border-gray-700 text-black rounded px-5 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 flex-1 px-4 py-3 rounded focus:ring-2 focus:ring-blue-600"
                />
                <button type="button" 
                  onClick={handlePaste} 
                  class="absolute right-3 top-1/2 transform -translate-y-1/2 bg-gray-700/80 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-all duration-300 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012 2h2a2 2 0 012-2"></path>
                  </svg>
                  Paste
                </button>
              </div>
              <button type="submit" class="h-14 px-8 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 transform hover:scale-105">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                </svg> 
                Download
              </button>
            </form>
          </div>
        </div>
      </div>

      {loading() && (
        <div class="flex justify-center mt-4">
          <svg class="animate-spin h-10 w-10 text-blue-600" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
        </div>
      )}

      {data() && data()?.result && (
        <div class="mt-6">
          <div class="mt-4 max-w-6xl mx-auto">
            <div class="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg overflow-hidden backdrop-blur-sm border border-white/10 p-4">
              <div class="flex flex-col md:flex-row gap-4">
                <div class="md:w-1/3 flex-shrink-0">
                  <div class="relative rounded-lg overflow-hidden max-h-[430px]">
                    {/* Fixed video source selection */}
                    <video 
                      controls 
                      src={data()!.result!.videoHD || data()!.result!.videoWatermark || ""} 
                      class="w-full h-full object-cover" 
                      referrerpolicy="no-referrer"
                      crossorigin="anonymous"
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                </div>

                <div class="md:w-2/3 flex flex-col justify-between">
                  <div class="mb-3">
                    <div class="flex items-center gap-3 justify-between mb-1">
                      {/* Fixed author avatar and nickname with proper null checks */}
                      <img 
                        src={data()!.result!.author?.avatar || "/default-avatar.png"}
                        alt={data()!.result!.author?.nickname || "User"}
                        class="rounded-full w-24 h-24 object-cover"
                        onError={(e) => {
                          // Fallback to a placeholder if image fails to load
                          e.currentTarget.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIGZpbGw9IiNmM2Y0ZjYiLz4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMCIgcj0iMyIgZmlsbD0iIzllYTNhOCIvPgo8cGF0aCBkPSJtNyAxOC4zYTUgNSAwIDAgMSAxMCAwIiBmaWxsPSIjOWVhM2E4Ii8+Cjwvc3ZnPg==";
                        }}
                      />
                      <h2 class="text-xl font-bold text-gray-900 dark:text-white">
                        {data()!.result!.author?.nickname || "Unknown User"}
                      </h2>
                      <div class="text-gray-400 text-xs px-2 py-1 bg-white/10 rounded-full"></div>
                    </div>
                    <div class="text-gray-400 text-xs mb-2">
                      {data()!.result!.desc || "No description available"}
                    </div>
                    
                    {/* Google AdSense Ad */}
                    <div class="flex justify-center my-4">
                      <ins 
                        class="adsbygoogle"
                        style="display:block"
                        data-ad-client="ca-pub-4342939946293194"
                        data-ad-slot="6107210287"
                        data-ad-format="auto"
                        data-full-width-responsive="true"
                      ></ins>
                    </div>
                  </div>

                  <div class="space-y-2">
                    {/* Enhanced download buttons with loading states and external service */}
                    {data()!.result!.videoHD && (
                      <button 
                        class={`w-full download-button bg-gradient-to-r from-pink-600 to-pink-400 hover:from-pink-500 hover:to-pink-300 text-white px-4 py-2 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 ${downloading() === 'HD' ? 'opacity-75 cursor-not-allowed' : ''}`}
                        onClick={() => downloadVideo(
                          data()!.result!.videoHD!, 
                          data()!.result!.author?.nickname || 'tiktok_video', 
                          'HD'
                        )}
                        disabled={downloading() === 'HD'}
                      >
                        {downloading() === 'HD' ? (
                          <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                          </svg>
                        )}
                        {downloading() === 'HD' ? 'Downloading...' : 'Download HD (No Watermark)'}
                      </button>
                    )}
                    
                    {data()!.result!.videoWatermark && (
                      <button 
                        class={`w-full download-button bg-gradient-to-r from-green-600 to-green-400 hover:from-green-500 hover:to-green-300 text-white px-4 py-2 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 ${downloading() === 'Watermark' ? 'opacity-75 cursor-not-allowed' : ''}`}
                        onClick={() => downloadVideo(
                          data()!.result!.videoWatermark!, 
                          data()!.result!.author?.nickname || 'tiktok_video', 
                          'Watermark'
                        )}
                        disabled={downloading() === 'Watermark'}
                      >
                        {downloading() === 'Watermark' ? (
                          <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                          </svg>
                        )}
                        {downloading() === 'Watermark' ? 'Downloading...' : 'Download (With Watermark)'}
                      </button>
                    )}

                    {data()!.result!.music && (
                      <button 
                        class={`w-full download-button bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-500 hover:to-blue-300 text-white px-4 py-2 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 ${downloading() === 'Audio' ? 'opacity-75 cursor-not-allowed' : ''}`}
                        onClick={() => downloadAudio(
                          data()!.result!.music!, 
                          data()!.result!.author?.nickname || 'tiktok_audio'
                        )}
                        disabled={downloading() === 'Audio'}
                      >
                        {downloading() === 'Audio' ? (
                          <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
                          </svg>
                        )}
                        {downloading() === 'Audio' ? 'Downloading...' : 'Download Audio'}
                      </button>
                    )}

                    <button class="w-full download-button bg-gradient-to-r from-gray-600 to-gray-400 hover:from-gray-500 hover:to-gray-300 text-white px-4 py-2 rounded-lg transition-all duration-300 flex items-center justify-center gap-2">
                      <a href="/" class="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
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
}

export default InputScreen;
