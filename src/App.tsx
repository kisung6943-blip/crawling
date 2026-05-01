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

  const handlePaste = (e: React.ClipboardEvent | React.ChangeEvent<HTMLTextAreaElement>) => {
    let content = "";
    if ('clipboardData' in e) {
      content = e.clipboardData.getData('text');
    } else {
      content = (e.target as HTMLTextAreaElement).value;
    }

    if (!content.trim()) return;

    // Smart Parsing Logic
    const lines = content.split(/\r?\n/).filter(line => line.trim().length > 10);
    const parsed: Product[] = [];

    // Check if it's TSV (Excel) or Raw Text (Listly)
    const isTSV = content.includes('\t');

    if (isTSV) {
      // Excel/TSV Mode
      lines.forEach((line, idx) => {
        const cols = line.split('\t');
        const title = cols[5]?.trim() || "";
        const rawPrice = cols[7]?.replace(/[^0-9]/g, '') || "0";
        const rawShipping = cols[9]?.replace(/[^0-9]/g, '') || "0";
        const mall = cols[33]?.trim() || "";
        const image = cols.find(c => c.startsWith('http') && (c.includes('.jpg') || c.includes('.png') || c.includes('.pstatic.net'))) || "";

        const price = parseInt(rawPrice);
        const shipping = parseInt(rawShipping);
        
        if (!isNaN(price) && title && !title.startsWith('LABEL-') && title !== "TITLE" && title !== "상품명") {
          parsed.push({ id: idx, image, title, price, shipping, totalPrice: price + shipping, mall: mall || "확인불가" });
        }
      });
    } else {
      // Intelligent Raw Text Mode (Heuristics)
      // Listly raw text often puts Image, Title, Price, Shipping, Mall in a sequence or block
      const blocks = content.split(/(?=\d{8,20}\s+https?:\/\/)/g).filter(b => b.length > 50);
      
      blocks.forEach((block, idx) => {
        const imageMatch = block.match(/https?:\/\/[^\s\t\n]+(?:\.jpg|\.png|\.gif|\.jpeg|\?type=[a-z0-9]+)/i);
        const priceMatch = block.match(/([\d,]+)원/g);
        const shippingMatch = block.match(/배송비\s*([\d,]+원|무료|[\d,]+)/i);
        
        // Mall is often after the price/shipping block
        const mallKeywords = ["ES리빙", "네이버플러스", "백화점", "아울렛", "공식"];
        let mall = "정보없음";
        mallKeywords.forEach(k => { if (block.includes(k)) mall = k; });
        
        // If mall is still "정보없음", try to find it near the end of a line
        if (mall === "정보없음") {
           const linesInBlock = block.split('\n');
           const lastMeaningfulLine = linesInBlock.find(l => l.length > 2 && l.length < 15 && !l.includes('원') && !l.includes('http'));
           if (lastMeaningfulLine) mall = lastMeaningfulLine.trim();
        }

        const titleCandidate = block.split(/\s{2,}|\t|\n/).find(s => s.length > 10 && !s.includes('http') && !s.includes('원'));

        if (titleCandidate && priceMatch) {
          const price = parseInt(priceMatch[0].replace(/[^0-9]/g, ''));
          const shipping = shippingMatch ? (shippingMatch[1].includes('무료') ? 0 : parseInt(shippingMatch[1].replace(/[^0-9]/g, ''))) : 0;
          parsed.push({
            id: idx,
            image: imageMatch ? imageMatch[0] : "",
            title: titleCandidate.trim(),
            price,
            shipping,
            totalPrice: price + shipping,
            mall
          });
        }
      });
    }

    // Final fallback: If no blocks found, try line by line with simple regex
    if (parsed.length === 0) {
      lines.forEach((line, idx) => {
        if (line.includes('LABEL-')) return; // Filter LABEL-x noise
        const img = line.match(/https?:\/\/[^\s\t\n]+(?:\.jpg|\.png|\.gif|\.jpeg|\?type=[a-z0-9]+)/i);
        const prc = line.match(/([\d,]+)원/);
        const shp = line.match(/배송비\s*([\d,]+)원/);
        const ttl = line.match(/[가-힣\w\s]{10,}/);
        
        if (ttl && prc) {
          const price = parseInt(prc[1].replace(/[^0-9]/g, ''));
          const shipping = shp ? parseInt(shp[1].replace(/[^0-9]/g, '')) : 0;
          parsed.push({
            id: idx,
            image: img ? img[0] : "",
            title: ttl[0].trim(),
            price,
            shipping,
            totalPrice: price + shipping,
            mall: "분석중"
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
              <h1 className="font-black text-xl tracking-tight text-slate-800 uppercase">Excel & Raw Analyzer</h1>
              <p className="text-[10px] text-[#03c75a] font-black tracking-widest italic">Intelligent Extraction Mode</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-black text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">Paste Anything</span>
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
                <div className={`absolute inset-0 bg-white/40 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center rounded-[2rem] transition-all pointer-events-none ${results.length > 0 ? 'opacity-0' : 'opacity-100'}`}>
                  <div className="w-20 h-20 bg-white rounded-3xl shadow-2xl flex items-center justify-center text-[#03c75a] mb-4 border border-slate-100">
                    <ImageIcon size={40} />
                  </div>
                  <p className="font-black text-slate-800 text-lg">데이터를 여기에 붙여넣으세요 (Ctrl+V)</p>
                  <p className="text-xs text-slate-400 font-bold mt-2">라벨/노이즈를 걸러내고 이미지를 추출합니다</p>
                </div>
                <textarea 
                  onPaste={handlePaste}
                  className="w-full h-80 p-8 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 shadow-inner focus:border-[#03c75a] outline-none transition-all resize-none text-[10px] text-slate-300 font-mono"
                  placeholder="리스틀리 복사본 붙여넣기 대기 중..."
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-[#03c75a] text-white p-8 rounded-[2.5rem] shadow-2xl shadow-green-900/10">
              <h3 className="text-sm font-black text-white/60 mb-6 flex items-center gap-2">💰 내 타겟 판매가 (합산 기준)</h3>
              <div className="relative mb-6">
                <input type="number" value={myPrice || ''} onChange={(e) => setMyPrice(Number(e.target.value))} placeholder="비교할 가격" className="w-full px-6 py-5 bg-white/20 rounded-2xl border-2 border-white/10 focus:border-white outline-none transition-all font-black text-3xl text-white placeholder:text-white/40" />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-white/30 text-xl">원</span>
              </div>
              {results.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/10 p-4 rounded-2xl">
                    <div className="text-[10px] font-black text-white/60 uppercase mb-1">최저 합산가</div>
                    <div className="text-lg font-black text-white">{stats.min.toLocaleString()}원</div>
                  </div>
                  <div className="bg-white/10 p-4 rounded-2xl">
                    <div className="text-[10px] font-black text-white/60 uppercase mb-1">분석 상품수</div>
                    <div className="text-lg font-black text-white">{stats.count}개</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {results.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="mt-12">
              <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-2xl shadow-slate-200/50">
                <div className="px-10 py-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                  <h2 className="font-black text-slate-800 flex items-center gap-2"><List size={20} /> 분석 결과 ({results.length}개 상품)</h2>
                  <div className="flex items-center gap-4 text-[10px] font-black text-[#03c75a] uppercase tracking-widest">
                    <span>Smart Extraction Enabled</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">이미지</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[300px]">상품명</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right bg-slate-100/50 min-w-[150px]">합산 가격</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right min-w-[120px]">판매가</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right min-w-[100px]">배송비</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center min-w-[150px]">판매처</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {results.map((p) => {
                        const diff = myPrice ? p.totalPrice - myPrice : 0;
                        return (
                          <tr key={p.id} className={`hover:bg-slate-50 transition-colors ${diff < 0 ? 'bg-red-50/30' : ''}`}>
                            <td className="px-8 py-5 text-center">
                              {p.image ? (
                                <img src={p.image} className="w-16 h-16 rounded-xl object-cover border border-slate-100 shadow-sm mx-auto bg-slate-50" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center text-slate-300 mx-auto"><ImageIcon size={20} /></div>
                              )}
                            </td>
                            <td className="px-8 py-5">
                              <span className="font-bold text-sm text-slate-800 break-words leading-snug">
                                {p.title}
                              </span>
                            </td>
                            <td className="px-8 py-5 text-right font-black text-slate-900 text-xl bg-slate-50/30 whitespace-nowrap">
                              {p.totalPrice.toLocaleString()}원
                              {myPrice > 0 && diff !== 0 && (
                                <div className={`text-[10px] mt-1 font-black ${diff < 0 ? 'text-red-500' : 'text-blue-500'}`}>
                                  {diff > 0 ? '+' : ''}{diff.toLocaleString()}원
                                </div>
                              )}
                            </td>
                            <td className="px-8 py-5 text-right font-bold text-slate-500 text-sm whitespace-nowrap">{p.price.toLocaleString()}원</td>
                            <td className="px-8 py-5 text-right font-bold text-slate-500 text-sm whitespace-nowrap">{p.shipping === 0 ? '무료' : `${p.shipping.toLocaleString()}원`}</td>
                            <td className="px-8 py-5 text-center">
                              <span className="text-[10px] font-black text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg inline-block min-w-[80px]">
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
