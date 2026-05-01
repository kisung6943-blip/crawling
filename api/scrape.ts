import axios from "axios";
import * as cheerio from "cheerio";
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const query = req.query.q as string;
  if (!query) {
    return res.status(400).json({ error: "Query parameter 'q' is required" });
  }

  try {
    const searchUrl = `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(query)}`;
    const response = await axios.get(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        "Referer": "https://search.shopping.naver.com/",
      },
      timeout: 8000,
    });

    const $ = cheerio.load(response.data);
    const results: any[] = [];

    // Try multiple selectors as Naver often changes them
    const items = $('[class*="product_item__"], .basicList_item__1_J6o, .product_item');
    
    items.each((i, el) => {
      if (results.length >= 40) return;

      const $el = $(el);
      const image = $el.find('img[class*="thumbnail_img__"]').attr('src') || 
                    $el.find('img').attr('src') || 
                    $el.find('[class*="image"] img').attr('src');
                    
      const title = $el.find('a[class*="product_link__"]').attr('title') || 
                    $el.find('a[class*="product_title__"]').text().trim() ||
                    $el.find('.basicList_link__1MaTN').text().trim();
                    
      const price = $el.find('span[class*="price_num__"]').text().trim() || 
                    $el.find('[class*="price"] em').text().trim() ||
                    $el.find('.price_num__2Wp_D').text().trim();
                    
      const shipping = $el.find('span[class*="price_delivery__"]').text().trim() || 
                       $el.find('[class*="delivery"]').text().trim() || 
                       "정보없음";
                       
      const mall = $el.find('a[class*="product_mall__"]').text().trim() || 
                   $el.find('[class*="mall_name"]').text().trim() || 
                   $el.find('img[alt*="몰"]').attr('alt') || 
                   "네이버페이";

      if (title && price) {
        results.push({ id: i, image, title, price, shipping, mall });
      }
    });

    if (results.length === 0) {
      console.log("No results found, possible selector change or block");
      return res.status(200).json({ results: [], message: "검색 결과가 없습니다. 네이버의 구조가 변경되었을 수 있습니다." });
    }

    res.json({ results });
  } catch (error: any) {
    console.error("Scraping error:", error.message);
    const status = error.response?.status || 500;
    const message = status === 403 ? "네이버에서 접근을 차단했습니다. 잠시 후 다시 시도해 주세요." : "데이터 수집 중 오류가 발생했습니다.";
    res.status(status).json({ error: message, details: error.message });
  }
}
