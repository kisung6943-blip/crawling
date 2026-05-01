import { VercelRequest, VercelResponse } from '@vercel.node';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { q, api_key } = req.query;

  if (!q || !api_key) {
    return res.status(400).json({ error: 'Keyword and API Key are required' });
  }

  try {
    const naverUrl = `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(q as string)}`;
    
    // Attempt with the 'api/single' endpoint mentioned in Listly beta docs
    // This endpoint often triggers a scrape and returns data if available
    const response = await axios.get('https://www.listly.io/api/single', {
      params: {
        key: api_key,
        url: naverUrl
      }
    });

    // If it returns data immediately
    if (response.data && (response.data.results || response.data.data)) {
      const results = response.data.results || response.data.data;
      const bestTab = Array.isArray(results) ? results.sort((a, b) => b.length - a.length)[0] : results;
      return res.status(200).json({ status: 'COMPLETED', results: bestTab });
    }

    // If it returns a job ID or something else
    const jobId = response.data.id || response.data.job_id;
    if (jobId) {
      return res.status(200).json({ jobId, status: 'CREATED' });
    }

    throw new Error('Unexpected API response format');
  } catch (error: any) {
    console.error('Listly Single API Error:', error.response?.data || error.message);
    
    // Last ditch: try the group endpoint if single fails
    try {
      const resp2 = await axios.get('https://www.listly.io/api/group', {
        params: { key: api_key, url: `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(q as string)}` }
      });
      return res.status(200).json({ results: resp2.data.results || resp2.data.data, status: 'COMPLETED' });
    } catch (e2: any) {
      res.status(500).json({ 
        error: '리스틀리 API 연동 실패 (Beta)', 
        details: error.response?.data || error.message,
        tried_url: 'https://www.listly.io/api/single'
      });
    }
  }
}
