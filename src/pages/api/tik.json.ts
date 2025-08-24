import type { APIRoute } from 'astro';
import axios from 'axios';

export const POST: APIRoute = async ({ request, url }) => {
  try {
    // Parse the incoming request body (expects JSON with a 'url' field)
    const { url: tiktokUrl } = await request.json();

    if (!tiktokUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing TikTok video URL' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Check for action query parameter (e.g., ?action=download)
    const action = url.searchParams.get('action');

    if (action === 'download') {
      // Fetch metadata to get the play URL
      const metadataResponse = await axios.get('https://tikwm.com/api', {
        params: {
          url: encodeURIComponent(tiktokUrl),
          hd: 1,
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const metadata = metadataResponse.data;

      if (metadata.code !== 0) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch video metadata from TikWM', detail: metadata.msg }),
          { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      }

      const videoUrl = metadata.data.play;
      if (!videoUrl) {
        return new Response(
          JSON.stringify({ error: 'No video URL found in metadata' }),
          { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      }

      // Fetch the video file
      const videoResponse = await axios.get(videoUrl, {
        responseType: 'stream',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'video/mp4',
        },
      });

      // Stream the video with download headers
      return new Response(videoResponse.data, {
        status: 200,
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Disposition': `attachment; filename="tiktok_video_${metadata.data.id}.mp4"`,
          'Access-Control-Allow-Origin': '*',
          'X-TikWM-Status': 'success',
        },
      });
    }

    // Default action: Fetch metadata
    const response = await axios.get('https://tikwm.com/api', {
      params: {
        url: encodeURIComponent(tiktokUrl),
        hd: 1,
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const data = response.data;

    if (data.code !== 0) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch from TikWM', detail: data.msg }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Return metadata with both preview and download URLs
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: data.data.id,
          title: data.data.title,
          author: data.data.author.nickname,
          play: `/api/tik.json?action=download&tikTokUrl=${encodeURIComponent(tiktokUrl)}`, // For download
          preview: data.data.play, // For video playback
          cover: data.data.cover,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (error: any) {
    console.error('Error in TikTok API route:', error.message);
    return new Response(
      JSON.stringify({ error: 'Server Error', detail: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }
};
