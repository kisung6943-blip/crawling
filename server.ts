import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import * as cheerio from "cheerio";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for scraping Naver Shopping
  app.get("/api/scrape", async (req, res) => {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ error: "Query parameter 'q' is required" });
    }

    try {
      // Use a common user-agent to avoid being blocked
      const searchUrl = `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(query)}`;
      const response = await axios.get(searchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        },
      });

      const $ = cheerio.load(response.data);
      const results: any[] = [];

      // Naver Shopping selector logic (selectors might change, so we try to be robust)
      // Usually product items are within divs that have specific class patterns
      // As of latest patterns: product_item__... or similar
      
      // We look for common product card patterns
      $('[class*="product_item__"]').each((i, el) => {
        if (results.length >= 40) return; // Limit results

        const $el = $(el);
        
        // Extracting Image
        const image = $el.find('img[class*="thumbnail_img__"]').attr('src') || 
                      $el.find('img').attr('src');
        
        // Extracting Title
        const title = $el.find('a[class*="product_link__"]').attr('title') || 
                      $el.find('a[class*="product_title__"]').text().trim();
        
        // Extracting Price
        const price = $el.find('span[class*="price_num__"]').text().trim() || 
                      $el.find('[class*="price"] em').text().trim();
        
        // Extracting Shipping
        const shipping = $el.find('span[class*="price_delivery__"]').text().trim() || 
                         $el.find('[class*="delivery"]').text().trim() || "정보없음";
        
        // Extracting Seller/Mall
        const mall = $el.find('a[class*="product_mall__"]').text().trim() || 
                     $el.find('[class*="mall_name"]').text().trim() || 
                     $el.find('img[alt*="몰"]').attr('alt') || "네이버페이";

        if (title && price) {
          results.push({
            id: i,
            image,
            title,
            price,
            shipping,
            mall
          });
        }
      });

      res.json({ results });
    } catch (error: any) {
      console.error("Scraping error:", error.message);
      res.status(500).json({ error: "Failed to fetch data from Naver" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
