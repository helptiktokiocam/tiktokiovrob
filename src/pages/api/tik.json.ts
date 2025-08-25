import type { APIRoute } from "astro";
import { Downloader } from "@tobyg74/tiktok-api-dl";

export const prerender = false;

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
          error: "Invalid TikTok URL format",
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
        }).then((response) => {
          return response.url.replace("douyin", "tiktok");
        });
        console.log("12. Processed douyin URL:", processedUrl);
      } catch (e) {
        console.error("Error processing douyin URL:", e);
      }
    }

    // Call the TikTok downloader
    console.log("13. Calling Downloader with URL:", processedUrl);
    let data = await Downloader(processedUrl, {
      version: "v3",
    });

    console.log("14. TikTok API response status:", data?.status);

    // Check if the response is successful
    if (!data || data.status === "error") {
      console.log("15. ERROR: TikTok API returned error");
      return new Response(
        JSON.stringify({
          error: data?.message || "Failed to fetch video data",
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
          error: "Invalid response format - missing result data",
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

    console.log("17. SUCCESS: Returning processed data");
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
        error: error.message || "Internal server error",
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
