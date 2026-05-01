import { VercelRequest, VercelResponse } from '@vercel.node';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { jobId, api_key } = req.query;

  if (!jobId || !api_key) {
    return res.status(400).json({ error: 'Job ID and API Key are required' });
  }

  try {
    // Try api.listly.io first
    const response = await axios.get(`https://api.listly.io/v1/jobs/${jobId}`, {
      headers: { 'Authorization': `Bearer ${api_key}` }
    });
    
    if (response.data.status === 'COMPLETED') {
      const resultResponse = await axios.get(`https://api.listly.io/v1/jobs/${jobId}/results`, {
        headers: { 'Authorization': `Bearer ${api_key}` }
      });
      const results = resultResponse.data.results;
      const bestTab = Array.isArray(results) ? results.sort((a, b) => b.length - a.length)[0] : results;
      return res.status(200).json({ status: 'COMPLETED', results: bestTab });
    }

    return res.status(200).json({ status: 'PROCESSING' });
  } catch (error: any) {
    // Fallback to www.listly.io
    try {
      const response2 = await axios.get(`https://www.listly.io/api/v1/jobs/${jobId}?api_key=${api_key}`);
      if (response2.data.status === 'COMPLETED') {
        const res2 = await axios.get(`https://www.listly.io/api/v1/jobs/${jobId}/results?api_key=${api_key}`);
        return res.status(200).json({ status: 'COMPLETED', results: res2.data.results });
      }
      return res.status(200).json({ status: 'PROCESSING' });
    } catch (e2: any) {
      res.status(500).json({ error: '상태 확인 실패', details: e2.message });
    }
  }
}
