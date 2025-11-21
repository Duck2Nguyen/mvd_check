// Cloudflare Workers CORS Proxy
// Deploy tại: https://workers.cloudflare.com/

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');
    
    if (!targetUrl) {
      return new Response('Missing url parameter', { status: 400 });
    }

    try {
      const response = await fetch(targetUrl, {
        method: request.method,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        }
      });

      const data = await response.text();
      
      return new Response(data, {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }
  }
}

// Cách deploy:
// 1. Vào https://workers.cloudflare.com/
// 2. Đăng ký tài khoản (free)
// 3. Create Worker → Paste code này
// 4. Deploy
// 5. Copy URL worker (vd: https://your-proxy.your-subdomain.workers.dev)
// 6. Dùng: https://your-proxy.your-subdomain.workers.dev?url=TARGET_URL
