import { VercelRequest, VercelResponse } from '@vercel.node';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { q, api_key } = req.query;

  if (!q || !api_key) {
    return res.status(400).json({ error: 'Keyword and API Key are required' });
  }

  try {
    const naverUrl = `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(q as string)}`;
    
    // 1. Create a Listly Job and return ID immediately to avoid Vercel timeout
    const createJobResponse = await axios.post('https://www.listly.io/api/v1/jobs', {
      url: naverUrl,
      api_key: api_key
    });

    const jobId = createJobResponse.data.id;
    if (!jobId) throw new Error('Failed to create Listly job');

    return res.status(200).json({ jobId, status: createJobResponse.data.status });
  } catch (error: any) {
    console.error('Listly Create Job Error:', error.response?.data || error.message);
    const details = error.response?.data?.message || error.response?.data || error.message;
    res.status(500).json({ 
      error: 'Listly 작업 생성 중 오류가 발생했습니다.', 
      details: details
    });
  }
}
