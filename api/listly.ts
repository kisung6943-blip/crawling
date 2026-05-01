import { VercelRequest, VercelResponse } from '@vercel.node';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { q, api_key } = req.query;

  if (!q || !api_key) {
    return res.status(400).json({ error: 'Keyword and API Key are required' });
  }

  try {
    const naverUrl = `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(q as string)}`;
    
    // According to Listly docs, some endpoints use 'key' instead of 'api_key'
    // And for triggering a new scrape, some users use the 'single' endpoint with a URL
    // Let's try the most common 'trigger' endpoint for Listly API
    const response = await axios.get('https://www.listly.io/api/v1/jobs/create', {
      params: {
        url: naverUrl,
        api_key: api_key
      }
    });

    const jobId = response.data.id || response.data.job_id;
    if (!jobId) throw new Error('Failed to create Listly job. Check if your API key supports dynamic URL scraping.');

    return res.status(200).json({ jobId, status: 'CREATED' });
  } catch (error: any) {
    console.error('Listly Create Job Error:', error.response?.data || error.message);
    
    // If v1 fails, try the other known endpoint format
    try {
       const altResponse = await axios.post('https://www.listly.io/api/v1/jobs', {
         url: `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(q as string)}`,
         api_key: api_key
       });
       return res.status(200).json({ jobId: altResponse.data.id, status: 'CREATED' });
    } catch (e2: any) {
       res.status(500).json({ 
         error: 'Listly API 접속 주소가 올바르지 않거나 권한이 없습니다.', 
         details: error.response?.data?.message || error.message,
         endpoint_tried: 'https://www.listly.io/api/v1/jobs'
       });
    }
  }
}
