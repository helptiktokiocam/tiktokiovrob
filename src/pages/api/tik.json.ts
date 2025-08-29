import type { APIRoute } from "astro";

export const prerender = false;

// Function to resolve short URLs
async function resolveShortUrl(url: string): Promise<string> {
  try {
    console.log("Resolving short URL:", url);
    
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1',
      },
      signal: AbortSignal.timeout(10000)
    });
    
    const resolvedUrl = response.url;
    console.log("Resolved to:", resolvedUrl);
    return resolvedUrl;
  } catch (error) {
    console.log("URL resolution failed:", error.message);
    return url; // Return original if resolution fails
  }
}

// Multiple API services to try
async function tryMultipleServices(url: string) {
  // First resolve short URLs
  let processedUrl = url;
  if (url.includes('/t/') || url.includes('vm.tiktok.com')) {
    processedUrl = await resolveShortUrl(url);
  }
  
  const services = [
    {
      name: 'TikWM',
      url: `https://www.tikwm.com/api/?url=${encodeURIComponent(processedUrl)}`,
      transform: (data: any) => ({
        status: "success",
        result: {
          type: data.data?.images ? "image" : "video",
          author: {
            avatar: data.data?.author?.avatar || null,
            nickname: data.data?.author?.unique_id || data.data?.author?.nickname || "Unknown Author"
          },
          desc: data.data?.title || "No description available",
          videoSD: data.data?.play || null,
          videoHD: data.data?.hdplay || data.data?.play || null,
          video_hd: data.data?.hdplay || null,
          videoWatermark: data.data?.wmplay || null,
          music: data.data?.music || null,
          uploadDate: data.data?.create_time ? new Date(data.data.create_time * 1000).toISOString() : null,
          images: data.data?.images || null
        }
      })
    },
    {
      name: 'TikWM Alt',
      url: `https://tikwm.com/api/?url=${encodeURIComponent(processedUrl)}`,
      transform: (data: any) => ({
        status: "success",
        result: {
          type: data.data?.images ? "image" : "video",
          author: {
            avatar: data.data?.author?.avatar || null,
            nickname: data.data?.author?.unique_id || data.data?.author?.nickname || "Unknown Author"
          },
          desc: data.data?.title || "No description available",
          videoSD: data.data?.play || null,
          videoHD: data.data?.hdplay || data.data?.play || null,
          video_hd: data.data?.hdplay || null,
          videoWatermark: data.data?.wmplay || null,
          music: data.data?.music || null,
          uploadDate: data.data?.create_time ? new Date(data.data.create_time * 1000).toISOString() : null,
          images: data.data?.images || null
        }
      })
    },
    {
      name: 'SnapTik API',
      url: `https://snaptik.app/abc?url=${encodeURIComponent(processedUrl)}`,
      transform: (data: any) => ({
        status: "success",
        result: {
          type: "video",
          author: {
            avatar: data.avatarLarger || null,
            nickname: data.authorMeta?.name || "Unknown Author"
          },
          desc: data.text || "No description available",
          videoSD: data.collector?.[0]?.url || null,
          videoHD: data.collector?.[1]?.url || data.collector?.[0]?.url || null,
          video_hd: data.collector?.[1]?.url || null,
          videoWatermark: data.collector?.find((item: any) => item.type === 'watermark')?.url || null,
          music: data.musicMeta?.playUrl || null,
          uploadDate: data.createTimeISO || null
        }
      })
    }
  ];
  
  const userAgents = [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'TikTok 26.2.0 rv:262018 (iPhone; iOS 14.4.2; en_US) Cronet'
  ];
  
  let lastError = null;
  
  for (const service of services) {
    for (const userAgent of userAgents) {
      try {
        console.log(`Trying ${service.name} with ${userAgent.split(' ')[0]}...`);
        
        const response = await fetch(service.url, {
          method: 'GET',
          headers: {
            'User-Agent': userAgent,
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0',
            'Referer': 'https://www.tiktok.com/',
            'Origin': 'https://www.tiktok.com'
          },
          signal: AbortSignal.timeout(15000)
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log(`${service.name} response:`, data);
        
        // Check if the response indicates success
        if (service.name.includes('TikWM')) {
          if (data.code === 0 && data.data) {
            return service.transform(data);
          } else {
            throw new Error(data.msg || `${service.name} returned error code: ${data.code}`);
          }
        } else if (service.name.includes('SnapTik')) {
          if (data && (data.collector || data.videoMeta)) {
            return service.transform(data);
          } else {
            throw new Error(`${service.name} returned invalid data structure`);
          }
        }
        
      } catch (error) {
        console.log(`${service.name} failed:`, error.message);
        lastError = error;
        
        // Add delay between attempts to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
    }
  }
  
  throw lastError || new Error("All API services failed");
}

export const GET: APIRoute = async (context) => {
  try {
    console.log("=== TikTok API Request ===");
    
    const url = context.url.searchParams.get("url");
    console.log("Requested URL:", url);
    
    if (!url) {
      return new Response(JSON.stringify({
        error: "URL parameter is required",
        status: "error"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // Validate TikTok URL
    if (!url.includes("tiktok.com") && !url.includes("douyin")) {
      return new Response(JSON.stringify({
        error: "Invalid URL. Please provide a valid TikTok URL.",
        status: "error"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    console.log("Starting API requests...");
    const data = await tryMultipleServices(url);
    
    // Validate result
    if (!data || !data.result) {
      throw new Error("No data returned from API services");
    }
    
    // Check for downloadable content
    const hasVideo = data.result.videoSD || data.result.videoHD || data.result.video_hd || data.result.videoWatermark;
    const hasAudio = data.result.music;
    const hasImages = data.result.images;
    
    if (!hasVideo && !hasAudio && !hasImages) {
      return new Response(JSON.stringify({
        error: "This video appears to be private, deleted, or not available for download.",
        status: "error"
      }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    console.log("Success! Returning data...");
    
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300", // 5 minute cache
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
    
  } catch (error) {
    console.error("=== Final Error ===", error);
    
    let errorMessage = "Unable to process TikTok video.";
    let statusCode = 500;
    
    if (error.message.includes("403")) {
      errorMessage = "TikTok is currently blocking requests. Please try again later or use a different URL format.";
      statusCode = 403;
    } else if (error.message.includes("404")) {
      errorMessage = "Video not found. It may be private, deleted, or the URL is incorrect.";
      statusCode = 404;
    } else if (error.message.includes("timeout")) {
      errorMessage = "Request timed out. The service may be temporarily unavailable.";
      statusCode = 408;
    } else if (error.message.includes("private") || error.message.includes("deleted")) {
      errorMessage = "This video is private or has been deleted.";
      statusCode = 404;
    }
    
    return new Response(JSON.stringify({
      error: errorMessage,
      status: "error",
      details: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: statusCode,
      headers: { "Content-Type": "application/json" }
    });
  }
};
