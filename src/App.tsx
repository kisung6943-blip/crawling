import React, { useState } from 'react';
import { Search, Loader2, Download, ExternalLink, Package, ShoppingBag, List, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Product {
  id: number;
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

    const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
    const parsed: Product[] = lines.map((line, idx) => {
      const cols = line.split('\t'); // Excel/Listly use Tabs for copy-paste
      
      // Column Mapping (0-indexed):
      // F = index 5
      // H = index 7
      // J = index 9
      // AH = index 33
      
      const title = cols[5]?.trim() || "";
      const rawPrice = cols[7]?.replace(/[^0-9]/g, '') || "0";
      const rawShipping = cols[9]?.replace(/[^0-9]/g, '') || "0";
      const mall = cols[33]?.trim() || "정보없음";

      const price = parseInt(rawPrice);
      const shipping = parseInt(rawShipping);
      
      if (isNaN(price) || title === "" || title === "TITLE" || title === "상품명") return null;

      return {
        id: idx,
        title,
        price,
        shipping,
        totalPrice: price + shipping,
        mall
      };
    }).filter((p): p is Product => p !== null);

    setResults(parsed);
    if ('target' in e && e.target instanceof HTMLTextAreaElement) {
      e.target.value = ""; // Clear for next paste
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
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg">
              <Package size={24} />
            </div>
            <div>
              <h1 className="font-black text-xl tracking-tight text-slate-800 uppercase">Excel Price Analyzer</h1>
              <p className="text-[10px] text-slate-400 font-black tracking-widest italic">Columns F, H, J, AH Focused</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-black text-[#03c75a] bg-green-50 px-3 py-1 rounded-full">Excel Paste Ready</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/20">
              <div className="flex gap-3 mb-8">
                <div className="relative flex-1 group">
                  <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="검색할 상품명..." className="w-full pl-12 pr-4 py-5 bg-slate-50 rounded-3xl border-2 border-transparent focus:border-slate-900 outline-none transition-all font-bold text-slate-700" />
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-900" size={20} />
                </div>
                <button onClick={openNaver} className="px-8 py-5 bg-slate-900 text-white rounded-3xl font-black hover:bg-slate-800 transition-all flex items-center gap-2 shadow-xl shadow-slate-200">
                  <ExternalLink size={20} /> 네이버 쇼핑
                </button>
              </div>

              <div className="relative">
                <div className={`absolute inset-0 bg-white/40 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center rounded-[2rem] transition-all pointer-events-none ${results.length > 0 ? 'opacity-0' : 'opacity-100'}`}>
                  <div className="w-20 h-20 bg-white rounded-3xl shadow-2xl flex items-center justify-center text-[#03c75a] mb-4 border border-slate-100">
                    <ShoppingBag size={40} />
                  </div>
                  <p className="font-black text-slate-800 text-lg">엑셀 데이터를 여기에 붙여넣으세요</p>
                  <p className="text-xs text-slate-400 font-bold mt-2">Ctrl+V를 누르면 F, H, J, AH열을 자동 분석합니다</p>
                </div>
                <textarea 
                  onPaste={handlePaste}
                  className="w-full h-80 p-8 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 shadow-inner focus:border-slate-900 outline-none transition-all resize-none text-[10px] text-slate-300 font-mono"
                  placeholder="데이터 붙여넣기 대기 중..."
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl shadow-slate-900/20">
              <h3 className="text-sm font-black text-slate-400 mb-6 flex items-center gap-2">🛒 내 타겟 판매가 (합산 기준)</h3>
              <div className="relative mb-6">
                <input type="number" value={myPrice || ''} onChange={(e) => setMyPrice(Number(e.target.value))} placeholder="비교할 가격" className="w-full px-6 py-5 bg-white/10 rounded-2xl border-2 border-white/10 focus:border-white outline-none transition-all font-black text-3xl text-white placeholder:text-white/20" />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-white/20 text-xl">원</span>
              </div>
              {results.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 p-4 rounded-2xl">
                    <div className="text-[10px] font-black text-slate-400 uppercase mb-1">최저 합산가</div>
                    <div className="text-lg font-black text-red-400">{stats.min.toLocaleString()}원</div>
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl">
                    <div className="text-[10px] font-black text-slate-400 uppercase mb-1">평균 합산가</div>
                    <div className="text-lg font-black text-white">{stats.avg.toLocaleString()}원</div>
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
                  <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <span>Column F: Title</span>
                    <span>H: Price</span>
                    <span>J: Shipping</span>
                    <span>AH: Mall</span>
                  </div>
                </div>
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">상품명 (F)</th>
                      <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right bg-slate-100/50">합산 가격 (H+J)</th>
                      <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">판매가 (H)</th>
                      <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">배송비 (J)</th>
                      <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">판매처 (AH)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {results.map((p) => {
                      const diff = myPrice ? p.totalPrice - myPrice : 0;
                      return (
                        <tr key={p.id} className={`hover:bg-slate-50 transition-colors ${diff < 0 ? 'bg-red-50/30' : ''}`}>
                          <td className="px-10 py-5"><span className="font-bold text-sm text-slate-800 line-clamp-1">{p.title}</span></td>
                          <td className="px-10 py-5 text-right font-black text-slate-900 text-xl bg-slate-50/30">
                            {p.totalPrice.toLocaleString()}원
                            {myPrice > 0 && diff !== 0 && (
                              <div className={`text-[10px] mt-1 font-black ${diff < 0 ? 'text-red-500' : 'text-blue-500'}`}>
                                {diff > 0 ? '+' : ''}{diff.toLocaleString()}원
                              </div>
                            )}
                          </td>
                          <td className="px-10 py-5 text-right font-bold text-slate-500 text-sm">{p.price.toLocaleString()}원</td>
                          <td className="px-10 py-5 text-right font-bold text-slate-500 text-sm">{p.shipping === 0 ? '무료' : `${p.shipping.toLocaleString()}원`}</td>
                          <td className="px-10 py-5 text-center"><span className="text-[10px] font-black text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg">{p.mall}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
