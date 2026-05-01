import { VercelRequest, VercelResponse } from '@vercel.node';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { q, api_key } = req.query;

  if (!q || !api_key) {
    return res.status(400).json({ error: 'Keyword and API Key are required' });
  }

  try {
    const naverUrl = `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(q as string)}`;
    
    // According to research, Listly Beta API requires the token directly in the Authorization header
    // and often uses the /api/single endpoint with a url parameter
    const response = await axios.get('https://www.listly.io/api/single', {
      params: {
        url: naverUrl,
        key: api_key // Some versions use key in query
      },
      headers: {
        'Authorization': api_key as string // Beta API often expects the raw token
      }
    });

    // If data is returned immediately
    if (response.data && (response.data.results || response.data.data)) {
      const results = response.data.results || response.data.data;
      const bestTab = Array.isArray(results) ? results.sort((a, b) => b.length - a.length)[0] : results;
      return res.status(200).json({ status: 'COMPLETED', results: bestTab });
    }

    // If it triggered a job and returned a status
    if (response.data.status === 'PROCESSING' || response.data.status === 'CREATED') {
       return res.status(200).json({ jobId: response.data.id || response.data.job_id, status: 'PROCESSING' });
    }

    return res.status(200).json({ status: 'COMPLETED', results: response.data });
  } catch (error: any) {
    console.error('Listly Beta API Error:', error.response?.data || error.message);
    
    // Fallback: Try with Bearer just in case
    try {
      const response2 = await axios.get('https://www.listly.io/api/single', {
        params: { url: `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(q as string)}` },
        headers: { 'Authorization': `Bearer ${api_key}` }
      });
      return res.status(200).json({ results: response2.data.results || response2.data.data, status: 'COMPLETED' });
    } catch (e2: any) {
      res.status(500).json({ 
        error: '리스틀리 베타 API 연동에 실패했습니다.', 
        details: error.response?.data || error.message,
        message: '리스틀리 계정의 API 권한을 확인해 주세요.'
      });
    }
  }
}
