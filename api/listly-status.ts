import { VercelRequest, VercelResponse } from '@vercel.node';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { jobId, api_key } = req.query;

  if (!jobId || !api_key) {
    return res.status(400).json({ error: 'Job ID and API Key are required' });
  }

  try {
    // 1. Check Job Status
    const statusResponse = await axios.get(`https://www.listly.io/api/v1/jobs/${jobId}?api_key=${api_key}`);
    const status = statusResponse.data.status;

    if (status === 'COMPLETED') {
      // 2. Get Results if completed
      const resultResponse = await axios.get(`https://www.listly.io/api/v1/jobs/${jobId}/results?api_key=${api_key}`);
      const results = resultResponse.data.results;
      const bestTab = Array.isArray(results) ? results.sort((a, b) => b.length - a.length)[0] : results;
      
      return res.status(200).json({ status: 'COMPLETED', results: bestTab });
    }

    if (status === 'FAILED') {
      return res.status(200).json({ status: 'FAILED', error: 'Listly job failed' });
    }

    // Still processing
    return res.status(200).json({ status: 'PROCESSING' });
  } catch (error: any) {
    console.error('Listly Status Error:', error.response?.data || error.message);
    res.status(500).json({ error: '상태 확인 중 오류가 발생했습니다.', details: error.response?.data });
  }
}
