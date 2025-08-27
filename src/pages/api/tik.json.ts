import type { APIRoute } from "astro";
import { Downloader } from "@tobyg74/tiktok-api-dl";

export const prerender = false;

// Function to normalize and expand TikTok URLs
async function normalizeTikTokUrl(url: string): Promise<string> {
  console.log("=== URL NORMALIZATION ===");
  console.log("Original URL:", url);
  
  let normalizedUrl = url.trim();
  
  // Remove any trailing slashes and parameters we don't need
  normalizedUrl = normalizedUrl.replace(/\?.*$/, '').replace(/\/$/, '');
  
  // Handle different TikTok URL formats
  try {
    // 1. Handle tiktok.com/t/ short URLs (new format)
    if (normalizedUrl.includes('/t/')) {
      console.log("Detected tiktok.com/t/ short URL, attempting expansion...");
      try {
        const response = await fetch(normalizedUrl, {
          method: 'HEAD',
          redirect: 'follow',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        if (response.url && response.url !== normalizedUrl) {
          normalizedUrl = response.url;
          console.log("Expanded /t/ URL:", normalizedUrl);
        }
      } catch (expansionError) {
        console.log("/t/ URL expansion failed, using original:", expansionError);
      }
    }
    
    // 2. Handle vm.tiktok.com short URLs (need expansion)
    else if (normalizedUrl.includes('vm.tiktok.com') && !normalizedUrl.includes('ZSAD')) {
      console.log("Detected vm.tiktok.com numeric URL, needs expansion");
      // Extract video ID and convert to proper short URL format
      const videoIdMatch = normalizedUrl.match(/(\d{19})/);
      if (videoIdMatch) {
        const videoId = videoIdMatch[1];
        normalizedUrl = `https://www.tiktok.com/@placeholder/video/${videoId}`;
        console.log("Converted to standard format:", normalizedUrl);
      }
    }
    
    // 3. Handle vt.tiktok.com URLs
    else if (normalizedUrl.includes('vt.tiktok.com')) {
      console.log("Detected vt.tiktok.com URL, converting...");
      const videoIdMatch = normalizedUrl.match(/(\d{19})/);
      if (videoIdMatch) {
        const videoId = videoIdMatch[1];
        normalizedUrl = `https://www.tiktok.com/@placeholder/video/${videoId}`;
        console.log("Converted to standard format:", normalizedUrl);
      }
    }
    
    // 4. Handle mobile URLs (m.tiktok.com)
    else if (normalizedUrl.includes('m.tiktok.com/v/')) {
      console.log("Detected mobile URL, converting...");
      const videoIdMatch = normalizedUrl.match(/\/v\/(\d{19})/);
      if (videoIdMatch) {
        const videoId = videoIdMatch[1];
        normalizedUrl = `https://www.tiktok.com/@placeholder/video/${videoId}`;
        console.log("Converted to standard format:", normalizedUrl);
      }
    }
    
    // 5. Handle URLs with missing username (/@/video/)
    else if (normalizedUrl.includes('/@/video/')) {
      console.log("Detected URL with missing username, fixing...");
      normalizedUrl = normalizedUrl.replace('/@/video/', '/@placeholder/video/');
      console.log("Fixed URL:", normalizedUrl);
    }
    
    // 6. Handle vm.tiktok.com with random string (these should work, just try to expand)
    else if (normalizedUrl.includes('vm.tiktok.com') && normalizedUrl.match(/[A-Za-z]/)) {
      console.log("Detected vm.tiktok.com with string, attempting expansion...");
      try {
        const response = await fetch(normalizedUrl, {
          method: 'HEAD',
          redirect: 'follow',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        if (response.url && response.url !== normalizedUrl) {
          normalizedUrl = response.url;
          console.log("Expanded URL:", normalizedUrl);
        }
      } catch (expansionError) {
        console.log("URL expansion failed, using original:", expansionError);
      }
    }
    
    // 7. Ensure we have https protocol
    if (!normalizedUrl.startsWith('http')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }
    
    console.log("Final normalized URL:", normalizedUrl);
    return normalizedUrl;
    
  } catch (error) {
    console.error("Error in URL normalization:", error);
    return url; // Return original if normalization fails
  }
}

// Function to try multiple URL variations if the first one fails
async function tryMultipleUrlFormats(originalUrl: string): Promise<any> {
  const normalizedUrl = await normalizeTikTokUrl(originalUrl);
  
  // Extract video ID for creating variations
  const videoIdMatch = normalizedUrl.match(/(\d{19})/);
  if (!videoIdMatch) {
    throw new Error("Could not extract video ID from URL");
  }
  
  const videoId = videoIdMatch[1];
  
  // Create multiple URL variations to try
  const urlVariations = [
    normalizedUrl,
    `https://www.tiktok.com/@/video/${videoId}`,
    `https://www.tiktok.com/@tiktok/video/${videoId}`,
    `https://www.tiktok.com/@user/video/${videoId}`,
    `https://vm.tiktok.com/${videoId}/`,
    `https://m.tiktok.com/v/${videoId}.html`,
  ];
  
  // Remove duplicates
  const uniqueUrls = [...new Set(urlVariations)];
  
  console.log("Trying URL variations:", uniqueUrls);
  
  let lastError = null;
  
  for (const urlToTry of uniqueUrls) {
    try {
      console.log(`Attempting to fetch with URL: ${urlToTry}`);
      
      const data = await Downloader(urlToTry, {
        version: "v3",
      });
      
      console.log(`Response from ${urlToTry}:`, data?.status);
      
      // If successful, return the data
      if (data && data.status === "success" && data.result) {
        console.log("SUCCESS with URL:", urlToTry);
        return data;
      }
      
      lastError = new Error(`API returned: ${data?.status} - ${data?.message || 'Unknown error'}`);
      
    } catch (error) {
      console.log(`Failed with ${urlToTry}:`, error.message);
      lastError = error;
      continue; // Try next variation
    }
  }
  
  // If all variations failed, throw the last error
  throw lastError || new Error("All URL variations failed");
}

export const GET: APIRoute = async (context) => {
  try {
    console.log("=== ASTRO API DEBUG ===");
    console.log("1. Full context:", Object.keys(context));
    console.log("2. request.url:", context.request.url);
    console.log("3. url object:", context.url);

    // Try multiple ways to get URL parameters
    const requestUrl = context.request.url;
    const contextUrl = context.url;

    console.log("4. Trying URL parsing...");

    // Method 1: Parse request.url directly
    let urlTik = "";
    try {
      const parsedUrl = new URL(requestUrl);
      urlTik = parsedUrl.searchParams.get("url") || "";
      console.log("5. Method 1 (request.url):", urlTik);
    } catch (e) {
      console.log("5. Method 1 failed:", e.message);
    }

    // Method 2: Use context.url
    if (!urlTik && contextUrl) {
      try {
        urlTik = contextUrl.searchParams.get("url") || "";
        console.log("6. Method 2 (context.url):", urlTik);
      } catch (e) {
        console.log("6. Method 2 failed:", e.message);
      }
    }

    // Method 3: Parse manually from URL string
    if (!urlTik) {
      try {
        const urlMatch = requestUrl.match(/[?&]url=([^&]*)/);
        if (urlMatch) {
          urlTik = decodeURIComponent(urlMatch[1]);
          console.log("7. Method 3 (regex):", urlTik);
        }
      } catch (e) {
        console.log("7. Method 3 failed:", e.message);
      }
    }

    console.log("8. Final urlTik:", urlTik);

    if (!urlTik) {
      console.log("9. ERROR: No URL parameter found with any method");
      console.log("Last Response", contextUrl);
      return new Response(
        JSON.stringify({
          error: "url is required",
          status: "error",
          debug: {
            requestUrl: requestUrl,
            contextUrl: contextUrl ? contextUrl.href : null,
            contextSearch: contextUrl ? contextUrl.search : null,
            tried: ["new URL(request.url)", "context.url", "regex parsing"],
          },
        }),
        {
          status: 400,
          headers: {
            "content-type": "application/json",
          },
        }
      );
    }

    // Validate TikTok URL format
    if (!urlTik.includes("tiktok.com") && !urlTik.includes("douyin")) {
      console.log("10. ERROR: Invalid TikTok URL format");
      return new Response(
        JSON.stringify({
          error: "Invalid TikTok URL format. Please provide a valid TikTok URL.",
          status: "error",
        }),
        {
          status: 400,
          headers: {
            "content-type": "application/json",
          },
        }
      );
    }

    console.log("11. URL validation passed, calling TikTok API...");

    // Handle douyin URLs
    let processedUrl = urlTik;
    if (urlTik.includes("douyin")) {
      try {
        processedUrl = await fetch(urlTik, {
          method: "HEAD",
          redirect: "follow",
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        }).then((response) => {
          return response.url.replace("douyin", "tiktok");
        });
        console.log("12. Processed douyin URL:", processedUrl);
      } catch (e) {
        console.error("Error processing douyin URL:", e);
      }
    }

    // Call the TikTok downloader with multiple URL format attempts
    console.log("13. Calling TikTok API with multiple URL formats...");
    let data = await tryMultipleUrlFormats(processedUrl);

    console.log("14. TikTok API response status:", data?.status);

    // Check if the response is successful
    if (!data || data.status === "error") {
      console.log("15. ERROR: TikTok API returned error");
      return new Response(
        JSON.stringify({
          error: data?.message || "Failed to fetch video data. The video might be private or restricted.",
          status: "error",
        }),
        {
          status: 400,
          headers: {
            "content-type": "application/json",
          },
        }
      );
    }

    // Validate response structure
    if (!data.result) {
      console.log("16. ERROR: No result data in response");
      return new Response(
        JSON.stringify({
          error: "Invalid response format - missing result data. The video might be unavailable.",
          status: "error",
        }),
        {
          status: 400,
          headers: {
            "content-type": "application/json",
          },
        }
      );
    }

    // Process the data
    const isStory = processedUrl.includes("/story/");
    if (isStory && data.result) {
      data.result.type = "story";
    }

    // Add upload date
    const createTime = data?.result?.create_time;
    const uploadDate = createTime ? new Date(createTime * 1000).toISOString() : null;
    if (data.result) {
      data.result.uploadDate = uploadDate;
    }

    // Ensure author object exists
    if (data.result && !data.result.author) {
      data.result.author = {
        avatar: null,
        nickname: "Unknown Author",
      };
    }

    // Check if we have video URLs - this is crucial for your issue
    const hasVideo = data.result.videoSD || data.result.videoHD || data.result.video_hd || data.result.videoWatermark;
    const hasAudio = data.result.music;
    
    if (!hasVideo && !hasAudio) {
      console.log("17. WARNING: No downloadable content found in response");
      return new Response(
        JSON.stringify({
          error: "Video not found or is not available for download. The video might be private, age-restricted, or deleted.",
          status: "error",
        }),
        {
          status: 400,
          headers: {
            "content-type": "application/json",
          },
        }
      );
    }

    console.log("18. SUCCESS: Returning processed data with video URLs");
    console.log("Available video URLs:", {
      videoSD: !!data.result.videoSD,
      videoHD: !!data.result.videoHD,
      video_hd: !!data.result.video_hd,
      videoWatermark: !!data.result.videoWatermark,
      music: !!data.result.music
    });
    
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "content-type": "application/json",
      },
    });
  } catch (error) {
    console.error("=== API ERROR ===", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error. Please try again with a different URL format.",
        status: "error",
        stack: error.stack,
      }),
      {
        status: 500,
        headers: {
          "content-type": "application/json",
        },
      }
    );
  }
};