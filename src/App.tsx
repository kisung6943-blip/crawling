import React, { useState } from 'react';
import { Search, Loader2, Download, ExternalLink, Package, ShoppingBag, List, LayoutGrid, Store, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Product {
  id: number;
  image: string;
  title: string;
  price: number;
  shipping: number;
  totalPrice: number;
  mall: string;
  isAd: boolean;
}

export default function App() {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [myPrice, setMyPrice] = useState<number>(0);

  const handlePaste = (e: React.ClipboardEvent | React.ChangeEvent<HTMLTextAreaElement>) => {
    let content = "";
    if ('clipboardData' in e) {
      content = e.clipboardData.getData('text');
    } else {
      content = (e.target as HTMLTextAreaElement).value;
    }

    if (!content.trim()) return;

    const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const parsed: Product[] = [];
    
    let current: Partial<Product> = { id: 0, title: "", price: 0, shipping: 0, mall: "정보없음", image: "", isAd: false };
    let tempId = 0;

    // State machine parser: more robust than block splitting
    lines.forEach((line) => {
      // 1. Detect Image URL (New product usually starts near an image)
      const imgMatch = line.match(/https?:\/\/[^\s\t\n]+(?:\.jpg|\.png|\.gif|\.jpeg|\?type=[a-z0-9]+)/i);
      if (imgMatch) {
        // If we already have a product in progress with a title, save it
        if (current.title && current.price) {
          parsed.push({ ...current, totalPrice: (current.price || 0) + (current.shipping || 0) } as Product);
          tempId++;
          current = { id: tempId, title: "", price: 0, shipping: 0, mall: "정보없음", image: "", isAd: false };
        }
        current.image = imgMatch[0];
        return;
      }

      // 2. Detect AD
      if (line === "광고" || line === "AD") {
        current.isAd = true;
        return;
      }

      // 3. Detect Price (Only if we don't have a price or it's the first price)
      const priceMatch = line.match(/^([\d,]+)원$/) || line.match(/^[가-힣\w\s]*\s?([\d,]+)원$/);
      if (priceMatch && !line.includes('배송비') && !line.includes('포인트')) {
        const p = parseInt(priceMatch[1].replace(/[^0-9]/g, ''));
        if (p > 500) { // Valid sell price
          if (!current.price) current.price = p;
        }
        return;
      }

      // 4. Detect Shipping
      if (line.includes('배송비')) {
        if (line.includes('무료')) {
          current.shipping = 0;
        } else {
          const shpMatch = line.match(/([\d,]+)원/);
          if (shpMatch) current.shipping = parseInt(shpMatch[1].replace(/[^0-9]/g, ''));
        }
        return;
      }

      // 5. Detect Mall (Look for common patterns in Listly raw text)
      const mallKeywords = ["ES리빙", "네이버플러스", "백화점", "아울렛", "공식", "전문점", "쇼핑몰", "스토어", "마켓", "컴퍼니", "리빙", "몰", "겔러리", "갤러리"];
      let foundMall = mallKeywords.find(k => line.includes(k));
      if (foundMall && !line.includes('원') && line.length < 20) {
        current.mall = line.split(/\s{2,}|\t/)[0].trim();
        return;
      }

      // 6. Detect Title (Longest string that isn't a URL or price)
      if (line.length > 10 && !line.includes('http') && !line.includes('원') && !line.includes('구매') && !line.includes('리뷰')) {
        if (!current.title) current.title = line.replace(/LABEL-\d+/g, '').trim();
      }
    });

    // Push the last one
    if (current.title && current.price) {
      parsed.push({ ...current, totalPrice: (current.price || 0) + (current.shipping || 0) } as Product);
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
              <h1 className="font-black text-xl tracking-tight text-slate-800 uppercase">Pro Price Intelligence</h1>
              <p className="text-[10px] text-[#03c75a] font-black tracking-widest italic">Sequential Analysis Engine v2.2</p>
            </div>
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
                  placeholder="데이터 붙여넣기 (Ctrl+V)..."
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl shadow-slate-900/10">
              <h3 className="text-sm font-black text-slate-400 mb-4 flex items-center gap-2">💰 내 타겟 판매가</h3>
              <div className="relative mb-6">
                <input type="number" value={myPrice || ''} onChange={(e) => setMyPrice(Number(e.target.value))} placeholder="비교할 가격" className="w-full px-6 py-5 bg-white/10 rounded-2xl border-2 border-white/5 focus:border-white outline-none transition-all font-black text-3xl text-white placeholder:text-white/20" />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-white/20 text-xl">원</span>
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {results.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="mt-12">
              <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-2xl shadow-slate-200/50">
                <div className="px-10 py-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
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
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right min-w-[100px]">배송비</th>
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
                                <img src={p.image} className="w-32 h-32 rounded-2xl object-contain border-2 border-white shadow-xl mx-auto bg-slate-50 transition-transform hover:scale-110" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-32 h-32 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-200 mx-auto"><ImageIcon size={32} /></div>
                              )}
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex flex-col gap-2">
                                {p.isAd && (
                                  <span className="inline-flex items-center gap-1 w-fit bg-orange-100 text-orange-600 px-2 py-0.5 rounded text-[10px] font-black tracking-tighter border border-orange-200">
                                    <AlertCircle size={10} /> AD 광고
                                  </span>
                                )}
                                <span className="font-black text-base text-slate-800 break-words leading-snug">
                                  {p.title}
                                </span>
                              </div>
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
                            <td className="px-8 py-6 text-right font-bold text-slate-400 text-sm whitespace-nowrap">{p.shipping === 0 ? '무료' : `${p.shipping.toLocaleString()}원`}</td>
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
