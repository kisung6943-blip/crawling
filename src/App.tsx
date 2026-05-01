import React, { useState } from 'react';
import { Search, Loader2, Download, ExternalLink, Package, ShoppingBag, List, LayoutGrid, Store, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Product {
  id: number;
  image: string;
  title: string;
  price: number;
  shipping: number;
  totalPrice: number;
  mall: string;
}

export default function App() {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [myPrice, setMyPrice] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const cleanText = (text: string) => {
    if (!text) return "";
    // Remove long URLs and noise
    return text.replace(/https?:\/\/[^\s\t\n]+/g, '').replace(/LABEL-\d+/g, '').trim();
  };

  const handlePaste = (e: React.ClipboardEvent | React.ChangeEvent<HTMLTextAreaElement>) => {
    let content = "";
    if ('clipboardData' in e) {
      content = e.clipboardData.getData('text');
    } else {
      content = (e.target as HTMLTextAreaElement).value;
    }

    if (!content.trim()) return;

    const lines = content.split(/\r?\n/).filter(line => line.trim().length > 10);
    const parsed: Product[] = [];
    const isTSV = content.includes('\t');

    if (isTSV) {
      lines.forEach((line, idx) => {
        const cols = line.split('\t');
        const title = cleanText(cols[5] || "");
        const rawPrice = cols[7]?.replace(/[^0-9]/g, '') || "0";
        const rawShipping = cols[9]?.replace(/[^0-9]/g, '') || "0";
        const mall = cleanText(cols[33] || "");
        const image = cols.find(c => c.startsWith('http') && (c.includes('.jpg') || c.includes('.png') || c.includes('.pstatic.net'))) || "";

        const price = parseInt(rawPrice);
        const shipping = parseInt(rawShipping);
        
        if (!isNaN(price) && title && price > 100) {
          parsed.push({ id: idx, image, title, price, shipping, totalPrice: price + shipping, mall: mall || "확인불가" });
        }
      });
    } else {
      // Improved block parsing for raw text
      const blocks = content.split(/(?=\d{8,20}\s+https?:\/\/)/g).filter(b => b.length > 50);
      
      blocks.forEach((block, idx) => {
        const imageMatch = block.match(/https?:\/\/[^\s\t\n]+(?:\.jpg|\.png|\.gif|\.jpeg|\?type=[a-z0-9]+)/i);
        const priceMatch = block.match(/([\d,]+)원/g);
        const shippingMatch = block.match(/배송비\s*([\d,]+원|무료|[\d,]+)/i);
        
        const mallKeywords = ["ES리빙", "네이버플러스", "백화점", "아울렛", "공식", "전문점"];
        let mall = "정보없음";
        mallKeywords.forEach(k => { if (block.includes(k)) mall = k; });

        if (mall === "정보없음") {
           const potentialMall = block.split(/\s{2,}|\t|\n/).find(s => s.length > 2 && s.length < 15 && !s.includes('원') && !s.includes('http') && !s.includes('구매'));
           if (potentialMall) mall = potentialMall.trim();
        }

        const titleCandidate = block.split(/\s{2,}|\t|\n/).find(s => s.length > 10 && !s.includes('http') && !s.includes('원'));

        if (titleCandidate && priceMatch) {
          const price = parseInt(priceMatch[0].replace(/[^0-9]/g, ''));
          const shipping = shippingMatch ? (shippingMatch[1].includes('무료') ? 0 : parseInt(shippingMatch[1].replace(/[^0-9]/g, ''))) : 0;
          parsed.push({
            id: idx,
            image: imageMatch ? imageMatch[0] : "",
            title: cleanText(titleCandidate),
            price,
            shipping,
            totalPrice: price + shipping,
            mall: cleanText(mall) || "정보없음"
          });
        }
      });
    }

    if (parsed.length === 0) {
      lines.forEach((line, idx) => {
        const img = line.match(/https?:\/\/[^\s\t\n]+(?:\.jpg|\.png|\.gif|\.jpeg|\?type=[a-z0-9]+)/i);
        const prc = line.match(/([\d,]+)원/);
        const shp = line.match(/배송비\s*([\d,]+)원/);
        const ttl = line.match(/[가-힣\w\s]{10,}/);
        
        if (ttl && prc) {
          const price = parseInt(prc[1].replace(/[^0-9]/g, ''));
          parsed.push({
            id: idx,
            image: img ? img[0] : "",
            title: cleanText(ttl[0]),
            price,
            shipping: shp ? parseInt(shp[1].replace(/[^0-9]/g, '')) : 0,
            totalPrice: price + (shp ? parseInt(shp[1].replace(/[^0-9]/g, '')) : 0),
            mall: "분석됨"
          });
        }
      });
    }

    setResults(parsed);
    if ('target' in e && e.target instanceof HTMLTextAreaElement) {
      e.target.value = ""; 
    }
  };

  const openNaver = () => {
    if (!keyword.trim()) return;
    window.open(`https://search.shopping.naver.com/search/all?query=${encodeURIComponent(keyword)}`, '_blank');
  };

  const stats = {
    min: results.length > 0 ? Math.min(...results.map(p => p.totalPrice)) : 0,
    avg: results.length > 0 ? Math.round(results.reduce((acc, p) => acc + p.totalPrice, 0) / results.length) : 0,
    count: results.length
  };

  return (
    <div className="min-h-screen pb-20 bg-slate-50 font-sans">
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#03c75a] rounded-xl flex items-center justify-center text-white shadow-lg shadow-green-200">
              <ShoppingBag size={24} />
            </div>
            <div>
              <h1 className="font-black text-xl tracking-tight text-slate-800 uppercase">Cleaner Price Analyzer</h1>
              <p className="text-[10px] text-[#03c75a] font-black tracking-widest italic">Url Filtering & Large Image Mode</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-black text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">Pro Mode</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/20">
              <div className="flex gap-3 mb-8">
                <div className="relative flex-1 group">
                  <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="검색할 상품명..." className="w-full pl-12 pr-4 py-5 bg-slate-50 rounded-3xl border-2 border-transparent focus:border-[#03c75a] outline-none transition-all font-bold text-slate-700" />
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#03c75a]" size={20} />
                </div>
                <button onClick={openNaver} className="px-8 py-5 bg-slate-900 text-white rounded-3xl font-black hover:bg-slate-800 transition-all flex items-center gap-2 shadow-xl shadow-slate-200">
                  <ExternalLink size={20} /> 네이버 쇼핑
                </button>
              </div>

              <div className="relative">
                <textarea 
                  onPaste={handlePaste}
                  className="w-full h-40 p-8 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 shadow-inner focus:border-[#03c75a] outline-none transition-all resize-none text-[10px] text-slate-300 font-mono"
                  placeholder="리스틀리 복사본 붙여넣기 (Ctrl+V)..."
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-[#03c75a] text-white p-8 rounded-[2.5rem] shadow-2xl shadow-green-900/10">
              <h3 className="text-sm font-black text-white/60 mb-4 flex items-center gap-2">💰 내 타겟 판매가</h3>
              <div className="relative mb-6">
                <input type="number" value={myPrice || ''} onChange={(e) => setMyPrice(Number(e.target.value))} placeholder="비교할 가격" className="w-full px-6 py-5 bg-white/20 rounded-2xl border-2 border-white/10 focus:border-white outline-none transition-all font-black text-3xl text-white placeholder:text-white/40" />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-white/30 text-xl">원</span>
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {results.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="mt-12">
              <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-2xl shadow-slate-200/50">
                <div className="px-10 py-6 bg-slate-50 border-b border-slate-200">
                  <h2 className="font-black text-slate-800 flex items-center gap-2"><List size={20} /> 분석 결과 ({results.length}개 상품)</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">이미지</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[300px]">상품 상세 정보</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right bg-slate-100/50 min-w-[150px]">합산 가격</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right min-w-[120px]">판매가</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center min-w-[150px]">판매처</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {results.map((p) => {
                        const diff = myPrice ? p.totalPrice - myPrice : 0;
                        return (
                          <tr key={p.id} className={`hover:bg-slate-50 transition-colors ${diff < 0 ? 'bg-red-50/30' : ''}`}>
                            <td className="px-8 py-6 text-center">
                              {p.image ? (
                                <img src={p.image} className="w-32 h-32 rounded-2xl object-cover border-2 border-white shadow-xl mx-auto bg-slate-50 transition-transform hover:scale-110" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-32 h-32 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-200 mx-auto"><ImageIcon size={32} /></div>
                              )}
                            </td>
                            <td className="px-8 py-6">
                              <span className="font-black text-base text-slate-800 break-words leading-snug">
                                {p.title}
                              </span>
                            </td>
                            <td className="px-8 py-6 text-right font-black text-slate-900 text-2xl bg-slate-50/30 whitespace-nowrap">
                              {p.totalPrice.toLocaleString()}원
                              {myPrice > 0 && diff !== 0 && (
                                <div className={`text-xs mt-1 font-black ${diff < 0 ? 'text-red-500' : 'text-blue-500'}`}>
                                  {diff > 0 ? '+' : ''}{diff.toLocaleString()}원
                                </div>
                              )}
                            </td>
                            <td className="px-8 py-6 text-right font-bold text-slate-400 text-sm whitespace-nowrap">{p.price.toLocaleString()}원</td>
                            <td className="px-8 py-6 text-center">
                              <span className="text-xs font-black text-slate-700 bg-white border-2 border-slate-100 px-4 py-2 rounded-xl inline-block shadow-sm">
                                {p.mall}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
