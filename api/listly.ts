import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { q, api_key } = req.query;

  if (!q || !api_key) {
    return res.status(400).json({ error: 'Keyword and API Key are required' });
  }

  try {
    const naverUrl = `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(q as string)}`;
    
    // 1. Create a Listly Job
    const createJobResponse = await axios.post('https://www.listly.io/api/v1/jobs', {
      url: naverUrl,
      api_key: api_key
    });

    const jobId = createJobResponse.data.id;
    if (!jobId) throw new Error('Failed to create Listly job');

    // 2. Poll for results (Wait up to 20 seconds)
    let results = null;
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 2000)); // Wait 2 seconds
      
      const statusResponse = await axios.get(`https://www.listly.io/api/v1/jobs/${jobId}?api_key=${api_key}`);
      
      if (statusResponse.data.status === 'COMPLETED') {
        // 3. Get the results
        const resultResponse = await axios.get(`https://www.listly.io/api/v1/jobs/${jobId}/results?api_key=${api_key}`);
        results = resultResponse.data.results;
        break;
      }
      
      if (statusResponse.data.status === 'FAILED') {
        throw new Error('Listly job failed');
      }
    }

    if (!results) {
      return res.status(202).json({ error: 'Job is still processing. Please try again in a few seconds.', jobId });
    }

    // Listly results are often an array of tabs. Let's find the one with the most data.
    const bestTab = Array.isArray(results) ? results.sort((a, b) => b.length - a.length)[0] : results;

    res.status(200).json({ results: bestTab });
  } catch (error: any) {
    console.error('Listly API Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Listly API 호출 중 오류가 발생했습니다.', details: error.response?.data });
  }
}
