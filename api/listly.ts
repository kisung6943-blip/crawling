import { VercelRequest, VercelResponse } from '@vercel.node';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { q, api_key } = req.query;

  if (!q || !api_key) {
    return res.status(400).json({ error: 'Keyword and API Key are required' });
  }

  try {
    const naverUrl = `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(q as string)}`;
    
    // Attempt 1: Developer API Endpoint (api.listly.io)
    // This is the most common endpoint for developers
    const response = await axios.post('https://api.listly.io/v1/jobs', {
      url: naverUrl
    }, {
      headers: {
        'Authorization': `Bearer ${api_key}`,
        'Content-Type': 'application/json'
      }
    });

    return res.status(200).json({ jobId: response.data.id, status: 'CREATED' });
  } catch (error: any) {
    console.error('Attempt 1 Failed:', error.message);
    
    // Attempt 2: Alternative Endpoint with Query Key
    try {
      const response2 = await axios.post(`https://www.listly.io/api/v1/jobs?api_key=${api_key}`, {
        url: `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(q as string)}`
      });
      return res.status(200).json({ jobId: response2.data.id, status: 'CREATED' });
    } catch (e2: any) {
      // If all fail, return detailed HTML/Text response for debugging
      const errorDetail = e2.response?.data || error.response?.data || e2.message;
      res.status(500).json({ 
        error: '모든 API 엔드포인트 접속에 실패했습니다.', 
        details: typeof errorDetail === 'string' ? errorDetail.substring(0, 500) : JSON.stringify(errorDetail),
        tried: ['api.listly.io/v1/jobs', 'www.listly.io/api/v1/jobs']
      });
    }
  }
}
