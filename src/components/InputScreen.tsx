import { toast, Toaster } from "solid-toast";
import { createSignal, onCleanup } from "solid-js";

interface TikTokData {
  status: string | null;
  result: {
    type: string | null;
    author: {
      avatar: string | null;
      nickname: string | null;
    } | null;
    desc: string | null;
    videoSD: string | null;
    videoHD: string | null;
    video_hd: string | null;
    videoWatermark: string | null;
    music: string | null;
    uploadDate?: string | null;
  } | null;
}

type Props = {};

function InputScreen({}: Props) {
  const [url, setUrl] = createSignal("");
  const [data, setData] = createSignal<TikTokData | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal("");
  const [adLoaded, setAdLoaded] = createSignal(false);
  const [autoProcessing, setAutoProcessing] = createSignal(false);

  // Function to extract TikTok URL from text that might contain promotional content
  const extractTikTokUrl = (text: string): string => {
    // Common TikTok URL patterns
    const patterns = [
      // vm.tiktok.com with short codes
      /https?:\/\/vm\.tiktok\.com\/[A-Za-z0-9]+/g,
      // vm.tiktok.com with numeric IDs
      /https?:\/\/vm\.tiktok\.com\/\d+/g,
      // vt.tiktok.com
      /https?:\/\/vt\.tiktok\.com\/[A-Za-z0-9]+/g,
      // Standard tiktok.com URLs
      /https?:\/\/(?:www\.)?tiktok\.com\/@[^\/\s]*\/video\/\d+/g,
      // Mobile tiktok URLs
      /https?:\/\/m\.tiktok\.com\/v\/\d+\.html/g,
      // Any tiktok.com URL
      /https?:\/\/[^\/]*tiktok\.com\/[^\s]*/g
    ];

    console.log("Extracting URL from text:", text);
    
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        // Return the first match, clean it up
        let url = matches[0];
        // Remove trailing punctuation that might be part of the sentence
        url = url.replace(/[.,!?;]+$/, '');
        console.log("Extracted URL:", url);
        return url;
      }
    }

    // If no pattern matches, check if the text itself is a clean URL
    const cleanText = text.trim();
    if (isValidTikTokUrl(cleanText)) {
      return cleanText;
    }

    return text; // Return original if no URL found
  };

  // Function to validate TikTok URL
  const isValidTikTokUrl = (url: string): boolean => {
    const tikTokPatterns = [
      /tiktok\.com/,
      /douyin/,
      /vm\.tiktok\.com/,
      /vt\.tiktok\.com/,
      /m\.tiktok\.com/
    ];
    
    return tikTokPatterns.some(pattern => pattern.test(url));
  };

  // Function to suggest URL format fixes
  const suggestUrlFix = (url: string): string => {
    if (url.includes('tiktok') && !url.startsWith('http')) {
      return 'https://' + url;
    }
    return url;
  };

  // Function to clean and format URL for better success rate
  const cleanTikTokUrl = (url: string): string => {
    let cleanUrl = url.trim();
    
    // First extract the TikTok URL if text contains promotional content
    cleanUrl = extractTikTokUrl(cleanUrl);
    
    // Remove tracking parameters that might interfere
    cleanUrl = cleanUrl.split('?')[0];
    
    // Ensure https protocol
    if (!cleanUrl.startsWith('http')) {
      cleanUrl = 'https://' + cleanUrl;
    }
    
    return cleanUrl;
  };

  const fetchData = async () => {
    setLoading(true);
    setError("");
    
    try {
      const tiktokUrl = url().trim();
      console.log("=== FRONTEND DEBUG ===");
      console.log("1. Original URL:", tiktokUrl);
      
      if (!tiktokUrl) {
        throw new Error("Please enter a TikTok URL");
      }

      if (!isValidTikTokUrl(tiktokUrl)) {
        const suggestedUrl = suggestUrlFix(tiktokUrl);
        if (suggestedUrl !== tiktokUrl) {
          setUrl(suggestedUrl);
          throw new Error(`Invalid TikTok URL. Try: ${suggestedUrl}`);
        } else {
          throw new Error("Please enter a valid TikTok URL (tiktok.com, vm.tiktok.com, etc.)");
        }
      }
      
      console.log("2. Encoded URL:", encodeURIComponent(tiktokUrl));
      
      const apiUrl = `/api/tik.json?url=${encodeURIComponent(tiktokUrl)}`;
      console.log("3. Final API URL:", apiUrl);
      
      let res = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log("4. Response status:", res.status);
      console.log("5. Response URL:", res.url);
      
      let json = await res.json();
      
      console.log("6. FULL API RESPONSE:");
      console.log(JSON.stringify(json, null, 2));
      
      if (json.debug) {
        console.log("7. DEBUG INFO FROM SERVER:");
        console.log(JSON.stringify(json.debug, null, 2));
      }
      
      if (!res.ok) {
        // More specific error messages based on status
        if (res.status === 400) {
          throw new Error(json.error || 'Invalid request. Please check your TikTok URL.');
        } else if (res.status === 404) {
          throw new Error('Video not found. The video might have been deleted or is private.');
        } else if (res.status === 500) {
          throw new Error('Server error. Please try again in a moment.');
        } else {
          throw new Error(`HTTP error! status: ${res.status} - ${json.error || 'Unknown error'}`);
        }
      }
      
      if (json.status === "error" || json.error) {
        throw new Error(json.error || json.message || "Failed to fetch video data");
      }

      if (!json.result) {
        throw new Error("No video data found. The video might be private or restricted.");
      }

      // Check if we have any downloadable content
      const hasVideo = json.result.videoSD || json.result.videoHD || json.result.video_hd || json.result.videoWatermark;
      const hasAudio = json.result.music;
      
      if (!hasVideo && !hasAudio) {
        throw new Error("No downloadable content found. The video might be protected or unavailable.");
      }

      setData(json);
      loadAd();
      setError("");
      
      toast.success("Video loaded successfully!", {
        duration: 2000,
        position: "bottom-center",
        style: {
          "font-size": "16px",
        },
      });
      
    } catch (error) {
      console.error("=== FETCH ERROR ===", error);
      
      let errorMessage = error.message || "An error occurred while fetching data";
      
      // Provide helpful suggestions based on error type
      if (errorMessage.includes("Invalid TikTok URL")) {
        errorMessage += "\n\nSupported formats:\n• https://www.tiktok.com/@username/video/123456789\n• https://vm.tiktok.com/shortcode/\n• https://m.tiktok.com/v/123456789.html";
      } else if (errorMessage.includes("private") || errorMessage.includes("restricted")) {
        errorMessage += "\n\nTip: Try copying the URL directly from the TikTok app or website.";
      } else if (errorMessage.includes("not found")) {
        errorMessage += "\n\nThe video might have been deleted or the URL is incorrect.";
      }
      
      toast.error(errorMessage, {
        duration: 5000,
        position: "bottom-center",
        style: {
          "font-size": "16px",
          "max-width": "400px",
          "white-space": "pre-line",
        },
      });
      
      setData(null);
      setError(error.message);
    }
    setLoading(false);
  };

  const handlePaste = async () => {
    try {
      const permission = await navigator.permissions.query({ name: 'clipboard-read' as any });
      if (permission.state === 'granted' || permission.state === 'prompt') {
        const text = await navigator.clipboard.readText();
        console.log("=== PASTE PROCESSING ===");
        console.log("Pasted raw text:", text);
        console.log("Text length:", text.length);
        
        // Extract and clean the TikTok URL from the pasted text
        const extractedUrl = extractTikTokUrl(text);
        const cleanedUrl = cleanTikTokUrl(extractedUrl);
        
        console.log("Extracted URL:", extractedUrl);
        console.log("Cleaned URL:", cleanedUrl);
        console.log("URL length:", cleanedUrl.length);
        
        setUrl(cleanedUrl);
        
        // Auto-validate pasted URL and provide feedback
        if (cleanedUrl && isValidTikTokUrl(cleanedUrl)) {
          // Enhanced detection for promotional content
          const isPromotionalContent = (
            text.length > cleanedUrl.length + 15 && // More than just URL + small buffer
            (
              text.toLowerCase().includes('tiktok lite') ||
              text.toLowerCase().includes('download tiktok') ||
              text.toLowerCase().includes('shared via') ||
              text.toLowerCase().includes('this post is') ||
              text.includes('://www.tiktok.com/tiktoklite') ||
              text.split(' ').length > 8 // More than 8 words suggests promotional text
            )
          );
          
          console.log("Is promotional content:", isPromotionalContent);
          console.log("Content indicators:", {
            lengthDiff: text.length - cleanedUrl.length,
            hasTikTokLite: text.toLowerCase().includes('tiktok lite'),
            hasDownloadTikTok: text.toLowerCase().includes('download tiktok'),
            hasSharedVia: text.toLowerCase().includes('shared via'),
            wordCount: text.split(' ').length
          });
          
          if (isPromotionalContent) {
            console.log("Auto-processing promotional content...");
            setAutoProcessing(true);
            
            toast.success("TikTok URL extracted! Starting download automatically...", {
              duration: 2500,
              position: "bottom-center",
              style: {
                "font-size": "14px",
              },
            });
            
            // Auto-start processing for promotional content
            setTimeout(() => {
              console.log("Executing auto fetchData...");
              fetchData();
            }, 1200); // Slightly longer delay to ensure UI updates
            
          } else {
            console.log("Direct URL pasted, no auto-processing");
            toast.success("Valid TikTok URL pasted! Click Download to process.", {
              duration: 1500,
              position: "bottom-center",
            });
          }
        } else if (text && text.includes('tiktok')) {
          toast.error("Could not extract a valid TikTok URL from the pasted content.", {
            duration: 2500,
            position: "bottom-center",
          });
        }
      }
    } catch (err) {
      console.error("Paste error:", err);
      toast.error("Clipboard access denied");
    }
  };

  // Function to cancel auto-processing
  const cancelAutoProcessing = () => {
    setAutoProcessing(false);
    toast.info("Auto-processing cancelled", {
      duration: 1000,
      position: "bottom-center",
    });
  };

  const loadAd = () => {
    const adContainer = document.getElementById("ad-banner");
    if (!adContainer) return;

    adContainer.innerHTML = '';

    if (!document.getElementById("aclib")) {
      const script = document.createElement("script");
      script.id = "aclib";
      script.src = "https://acscdn.com/script/aclib.js";
      script.async = true;
      script.onload = () => {
        if (typeof aclib !== 'undefined') {
          runAdcashBanner();
        } else {
          showFallbackAd();
        }
      };
      script.onerror = () => {
        showFallbackAd();
      };
      document.body.appendChild(script);
    } else {
      if (typeof aclib !== 'undefined') {
        runAdcashBanner();
      } else {
        showFallbackAd();
      }
    }
  };

  const runAdcashBanner = () => {
    const adContainer = document.getElementById("ad-banner");
    if (!adContainer) return;

    try {
      adContainer.innerHTML = '<div id="ac-banner"></div>';
      aclib.runBanner({
        zoneId: '9480206',
        width: 336,
        height: 280,
        container: document.getElementById("ac-banner")
      });
      setAdLoaded(true);
    } catch (e) {
      console.error("Adcash error:", e);
      showFallbackAd();
    }
  };

  const showFallbackAd = () => {
    const adContainer = document.getElementById("ad-banner");
    if (!adContainer) return;
    
    adContainer.innerHTML = `
      <div style="width:336px;height:280px;background:#f5f5f5;display:flex;align-items:center;justify-content:center;border-radius:8px;border:1px dashed #ddd;">
        <div style="text-align:center;color:#666;">
          <p>Advertisement</p>
          <p style="font-size:12px;margin-top:8px;">Ad failed to load.. Please wait</p>
        </div>
      </div>
    `;
  };

  onCleanup(() => {
    const script = document.getElementById("aclib");
    if (script) script.remove();
  });

  const getVideoUrl = () => {
    const result = data()?.result;
    return result?.videoSD || result?.videoHD || result?.video_hd || result?.videoWatermark || result?.music || "";
  };

  const getAuthorInfo = () => {
    const author = data()?.result?.author;
    return {
      avatar: author?.avatar || "",
      nickname: author?.nickname || "Unknown Author"
    };
  };

  // Helper to get safe filename for downloads
  const getSafeFilename = () => {
    const author = getAuthorInfo().nickname;
    return author.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
  };

  return (
    <div class="max-w-6xl mx-auto mt-8 px-4">
      <Toaster />

      {/* Enhanced Input Form Section */}
      <div class="max-w-6xl mx-auto">
        <div class="download-box rounded-2xl">
          <div class="bg-cyan-800/80 rounded-xl backdrop-blur-md p-4">
            <form class="flex flex-col md:flex-row items-stretch md:items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                
                // Don't start manual processing if auto-processing is happening
                if (autoProcessing()) {
                  toast.info("Auto-processing in progress...", {
                    duration: 1000,
                    position: "bottom-center",
                  });
                  return;
                }
                
                const currentUrl = url().trim();
                console.log("=== FORM SUBMISSION ===");
                console.log("Form submission - URL value:", currentUrl);
                
                // Auto-extract URL if the input contains promotional text
                if (currentUrl && currentUrl.length > 100 && currentUrl.includes('tiktok')) {
                  const extractedUrl = extractTikTokUrl(currentUrl);
                  if (extractedUrl !== currentUrl) {
                    setUrl(extractedUrl);
                    toast.info("Extracted TikTok URL from shared content", {
                      duration: 1500,
                      position: "bottom-center",
                    });
                    // Small delay to let user see the extraction
                    setTimeout(() => fetchData(), 500);
                    return;
                  }
                }
                
                fetchData();
              }}
            >
              <div class="relative flex-grow rounded bg-white">
                <input type="text"
                  value={url()}
                  onInput={(e) => {
                    const newUrl = e.currentTarget.value;
                    console.log("Input changed:", newUrl);
                    setUrl(newUrl);
                    
                    // Clear previous error when user starts typing
                    if (error()) {
                      setError("");
                    }

                    // Auto-detect and process promotional content when typing/pasting into input
                    if (newUrl && newUrl.length > 50 && newUrl.includes('tiktok')) {
                      const extractedUrl = extractTikTokUrl(newUrl);
                      const cleanedUrl = cleanTikTokUrl(extractedUrl);
                      
                      // Check if this looks like promotional content
                      const isPromotionalContent = (
                        newUrl.length > cleanedUrl.length + 15 &&
                        (
                          newUrl.toLowerCase().includes('tiktok lite') ||
                          newUrl.toLowerCase().includes('download tiktok') ||
                          newUrl.toLowerCase().includes('shared via') ||
                          newUrl.toLowerCase().includes('this post is') ||
                          newUrl.includes('://www.tiktok.com/tiktoklite') ||
                          newUrl.split(' ').length > 8
                        )
                      );

                      if (isPromotionalContent && cleanedUrl !== newUrl) {
                        console.log("Auto-processing detected in input field");
                        setUrl(cleanedUrl);
                        setAutoProcessing(true);
                        
                        toast.success("TikTok URL extracted! Starting download automatically...", {
                          duration: 2500,
                          position: "bottom-center",
                        });
                        
                        // Auto-process after short delay
                        setTimeout(() => {
                          fetchData();
                        }, 1200);
                      }
                    }
                  }}
                  onPaste={(e) => {
                    // Handle paste event directly in the input field
                    setTimeout(() => {
                      const pastedText = e.currentTarget.value;
                      console.log("Direct paste in input:", pastedText);
                      
                      if (pastedText && pastedText.length > 50) {
                        const extractedUrl = extractTikTokUrl(pastedText);
                        const cleanedUrl = cleanTikTokUrl(extractedUrl);
                        
                        const isPromotionalContent = (
                          pastedText.length > cleanedUrl.length + 15 &&
                          (
                            pastedText.toLowerCase().includes('tiktok lite') ||
                            pastedText.toLowerCase().includes('download tiktok') ||
                            pastedText.toLowerCase().includes('shared via') ||
                            pastedText.toLowerCase().includes('this post is') ||
                            pastedText.includes('://www.tiktok.com/tiktoklite') ||
                            pastedText.split(' ').length > 8
                          )
                        );

                        if (isPromotionalContent && cleanedUrl !== pastedText) {
                          console.log("Auto-processing pasted promotional content");
                          setUrl(cleanedUrl);
                          setAutoProcessing(true);
                          
                          toast.success("TikTok URL extracted! Starting download automatically...", {
                            duration: 2500,
                            position: "bottom-center",
                          });
                          
                          setTimeout(() => {
                            fetchData();
                          }, 1200);
                        }
                      }
                    }, 100); // Small delay to let paste complete
                  }}
                  placeholder="Paste TikTok video link or shared content here (we'll extract the URL automatically)"
                  class="w-full h-14 border-gray-700 text-black rounded-xl px-5 pr-20 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                />
                <button type="button" 
                  onClick={handlePaste} 
                  class="absolute right-3 top-1/2 transform -translate-y-1/2 bg-gray-700/80 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-all duration-300 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 112 2h2a2 2 0 012-2"></path>
                  </svg>
                  Paste
                </button>
              </div>
              <button type="submit" 
                disabled={loading() || autoProcessing()}
                class="h-14 px-8 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 disabled:from-gray-500 disabled:to-gray-400 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed">
                {loading() ? (
                  <>
                    <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Processing...
                  </>
                ) : autoProcessing() ? (
                  <>
                    <svg class="animate-pulse h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="12" r="3"/>
                      <circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" stroke-width="2" opacity="0.5"/>
                    </svg>
                    Auto-starting...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                    </svg> 
                    Download
                  </>
                )}
              </button>
            </form>
            
            {/* Auto-processing indicator with cancel option */}
            {autoProcessing() && (
              <div class="mt-3 p-3 bg-blue-100 border border-blue-300 rounded-lg flex items-center justify-between">
                <div class="flex items-center gap-2 text-blue-700">
                  <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  <span class="text-sm font-medium">Auto-processing extracted URL...</span>
                </div>
                <button 
                  onClick={cancelAutoProcessing}
                  class="text-blue-600 hover:text-blue-800 text-sm underline transition-colors">
                  Cancel
                </button>
              </div>
            )}
            
            
          </div>
          {/* URL Format Help */}
            <div class="mt-3 text-xs text-white/70">
              <p>
                {autoProcessing() ? (
                  <span class="flex items-center gap-1">
                    <svg class="animate-spin h-3 w-3" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Auto-processing TikTok Lite shared content...
                  </span>
                ) : (
                  "Supported: Direct TikTok URLs, TikTok Lite shared content, vm.tiktok.com, m.tiktok.com - we'll extract the video URL automatically!"
                )}
              </p>
            </div>
        </div>
      </div>

      {error() && (
        <div class="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <strong>Error:</strong>
          </div>
          <p class="mt-1">{error()}</p>
        </div>
      )}

      {data() && data()?.result && (
        <div class="mt-6">
          <div class="mt-4 max-w-6xl mx-auto">
            <div class="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg overflow-hidden backdrop-blur-sm border border-white/10 p-4">
              <div class="flex flex-col md:flex-row gap-4">
                <div class="md:w-1/3 flex-shrink-0">
                  <div class="relative rounded-lg overflow-hidden max-h-[430px]">
                    {getVideoUrl() && (
                      <video 
                        controls 
                        src={getVideoUrl()} 
                        class="w-full h-full object-cover" 
                        referrerpolicy="no-referrer"
                      >
                        Your browser does not support the video tag.
                      </video>
                    )}
                  </div>
                </div>

                <div class="md:w-2/3 flex flex-col justify-between">
                  <div class="mb-3">
                    <div class="flex items-center gap-3 justify-between mb-1">
                      {getAuthorInfo().avatar && (
                        <img 
                          src={getAuthorInfo().avatar}
                          alt={getAuthorInfo().nickname}
                          class="rounded-full w-24 h-24"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                      <h2 class="text-xl font-bold text-gray-900 dark:text-white">
                        {getAuthorInfo().nickname}
                      </h2>
                      <div class="text-gray-400 text-xs px-2 py-1 bg-white/10 rounded-full"></div>
                    </div>
                    <div class="text-gray-400 text-xs mb-2">
                      {data()?.result?.desc || "No description available"}
                    </div>
                    
                    {/* Ad Banner Container */}
                    <div class="flex justify-center my-4">
                      <div id="ad-banner" style="min-height:280px;width:336px;margin:0 auto;">
                        {!adLoaded() && (
                          <div style="width:336px;height:280px;display:flex;align-items:center;justify-content:center;background:#f5f5f5;border-radius:8px;">
                            <div class="animate-pulse text-gray-400">Loading advertisement...</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div class="space-y-2">
                    {data()?.result?.videoSD && (
                      <button class="download-button bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-500 hover:to-blue-300 w-full p-3 rounded-lg text-white flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                        </svg> 
                        <a href={`https://dl.tiktokiocdn.workers.dev/api/download?url=${encodeURIComponent(data()!.result!.videoSD!)}&type=.mp4&title=${getSafeFilename()}`} class="text-white no-underline">
                          Download SD (No Watermark)
                        </a>
                      </button>
                    )}

                    {(data()?.result?.videoHD || data()?.result?.video_hd) && (
                      <button class="download-button bg-gradient-to-r from-pink-600 to-pink-400 hover:from-pink-500 hover:to-pink-300 w-full p-3 rounded-lg text-white flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                        </svg> 
                        <a href={`https://dl.tiktokiocdn.workers.dev/api/download?url=${encodeURIComponent((data()!.result!.videoHD || data()!.result!.video_hd)!)}&type=.mp4&title=${getSafeFilename()}`} class="text-white no-underline">
                          Download HD (No Watermark)
                        </a>
                      </button>
                    )}

                    {data()?.result?.videoWatermark && (
                      <button class="download-button bg-gradient-to-r from-green-600 to-green-400 hover:from-green-500 hover:to-green-300 w-full p-3 rounded-lg text-white flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
                        </svg> 
                        <a href={`https://dl.tiktokiocdn.workers.dev/api/download?url=${encodeURIComponent(data()!.result!.videoWatermark!)}&type=.mp4&title=${getSafeFilename()}`} class="text-white no-underline">
                          Download (With Watermark)
                        </a>
                      </button>
                    )}

                    {data()?.result?.music && (
                      <button class="download-button bg-gradient-to-r from-yellow-600 to-yellow-400 hover:from-yellow-500 hover:to-yellow-300 w-full p-3 rounded-lg text-white flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
                        </svg> 
                        <a href={`https://dl.tiktokiocdn.workers.dev/api/download?url=${encodeURIComponent(data()!.result!.music!)}&type=.mp3&title=${getSafeFilename()}_audio`} class="text-white no-underline">
                          Download Audio Only
                        </a>
                      </button>
                    )}

                    <button class="download-button bg-gradient-to-r from-purple-600 to-purple-400 hover:from-purple-500 hover:to-purple-300 w-full p-3 rounded-lg text-white flex items-center justify-center">
                      <a href="/" class="text-white no-underline">Download Another Video</a> 
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
