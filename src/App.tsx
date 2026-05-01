import React, { useState } from 'react';
import { Search, Loader2, Download, ExternalLink, Package, ShoppingBag, Store, LayoutGrid, List } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Product {
  id: number;
  image: string;
  title: string;
  price: string;
  shipping: string;
  mall: string;
}

export default function App() {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myPrice, setMyPrice] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [apiKey, setApiKey] = useState('I4sxSwftWCGvLkEGR353OzMkl3Uf2thi');

  const stats = {
    min: results.length > 0 ? Math.min(...results.map(p => {
      const val = parseInt(String(p.price).replace(/[^0-9]/g, ''));
      return isNaN(val) ? Infinity : val;
    })) : 0,
    avg: results.length > 0 ? Math.round(results.reduce((acc, p) => acc + (parseInt(String(p.price).replace(/[^0-9]/g, '')) || 0), 0) / results.length) : 0,
    count: results.length
  };

  const handleAutoSearch = async () => {
    if (!keyword.trim()) return;
    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      const createRes = await fetch(`/api/listly?q=${encodeURIComponent(keyword)}&api_key=${apiKey}`);
      const createData = await createRes.json();
      if (createData.error) throw new Error(createData.error);
      
      let attempts = 0;
      const poll = async () => {
        if (attempts >= 20) throw new Error("수집 시간이 초과되었습니다. 수동 붙여넣기를 이용해 주세요.");
        attempts++;
        const statusRes = await fetch(`/api/listly-status?jobId=${createData.jobId}&api_key=${apiKey}`);
        const statusData = await statusRes.json();
        if (statusData.status === 'COMPLETED') {
          processData(statusData.results);
          setIsLoading(false);
        } else if (statusData.status === 'FAILED') {
          throw new Error("수집 실패");
        } else {
          setTimeout(poll, 2000);
        }
      };
      setTimeout(poll, 2000);
    } catch (err: any) {
      setError("자동 추출 권한이 제한되어 있습니다. 수동 붙여넣기를 이용해 주세요.");
      setIsLoading(false);
    }
  };

  const processData = (rawData: any[]) => {
    const mapped = rawData.map((item: any, idx: number) => {
      const find = (reg: RegExp, fb: any = "") => {
        const k = Object.keys(item).find(key => reg.test(key));
        return k ? String(item[k]).trim() : fb;
      };
      return {
        id: idx,
        image: find(/이미지|사진|image|src/i, item.image),
        title: find(/제목|상품명|title/i, item.title),
        price: find(/가격|금액|price/i, item.price),
        shipping: find(/배송|택배/i, item.shipping) || "정보없음",
        mall: find(/판매처|몰|mall/i, item.mall) || "네이버페이"
      };
    }).filter(p => p.title && p.title.length > 2);
    setResults(mapped);
  };

  const handlePaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value.trim();
    if (!val) return;
    try {
      // Simple heuristic for TSV/Raw Text
      const lines = val.split('\n').filter(l => l.length > 5);
      const data = lines.map(line => {
        const parts = line.split('\t');
        if (parts.length > 2) return { title: parts[0], price: parts[1], mall: parts[2] };
        return { title: line };
      });
      processData(data);
    } catch (e) {}
  };

  const openNaver = () => {
    if (!keyword.trim()) return;
    window.open(`https://search.shopping.naver.com/search/all?query=${encodeURIComponent(keyword)}`, '_blank');
  };

  return (
    <div className="min-h-screen pb-20 bg-slate-50 font-sans">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#03c75a] rounded-xl flex items-center justify-center text-white shadow-lg shadow-green-200">
              <ShoppingBag size={24} />
            </div>
            <div>
              <h1 className="font-black text-xl tracking-tight text-slate-800">Price Intelligence</h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Naver Shopping Analyzer</p>
            </div>
          </div>
          <button onClick={() => {}} disabled={results.length === 0} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-20 transition-all text-sm font-bold shadow-xl shadow-slate-200">
            <Download size={18} /> 엑셀 다운로드
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { s: 1, t: '네이버 쇼핑 검색', d: '키워드 입력 후 검색창 열기', c: 'bg-blue-500' },
                { s: 2, t: '데이터 복사', d: '리스틀리 확장 프로그램 실행', c: 'bg-green-500' },
                { s: 3, t: '여기에 붙여넣기', d: '아래 영역에 Ctrl+V', c: 'bg-purple-500' }
              ].map(item => (
                <div key={item.s} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-2">
                  <div className={`w-8 h-8 ${item.c} rounded-full flex items-center justify-center text-white text-xs font-black shadow-lg shadow-inherit/20`}>{item.s}</div>
                  <div className="font-black text-slate-800 text-sm mt-2">{item.t}</div>
                  <div className="text-[11px] text-slate-400 font-bold">{item.d}</div>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="검색어를 입력하세요..." className="w-full pl-12 pr-4 py-5 bg-white rounded-3xl border-2 border-transparent shadow-xl shadow-slate-200/50 focus:border-[#03c75a] outline-none transition-all font-bold text-slate-700" />
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                </div>
                <button onClick={openNaver} className="px-8 py-5 bg-slate-900 text-white rounded-3xl font-black hover:bg-slate-800 transition-all flex items-center gap-2 shadow-xl shadow-slate-200">
                  <ExternalLink size={20} /> <span className="hidden sm:inline">네이버 검색</span>
                </button>
              </div>
              <div className="relative group">
                <textarea onChange={handlePaste} className="w-full h-48 p-8 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 shadow-inner focus:border-[#03c75a] outline-none transition-all resize-none text-xs text-slate-400 font-mono" placeholder="리스틀리에서 복사한 데이터를 여기에 붙여넣으세요 (Ctrl+V)..." />
                {isLoading && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-[2.5rem] flex flex-col items-center justify-center gap-4">
                    <Loader2 className="animate-spin text-[#03c75a]" size={40} />
                    <p className="font-black text-slate-500">데이터 수집 중...</p>
                  </div>
                )}
              </div>
              <button onClick={handleAutoSearch} className="text-[10px] font-black text-slate-300 hover:text-[#03c75a] transition-colors flex items-center gap-1 uppercase tracking-widest">
                <Store size={12} /> API Auto-Extract Beta
              </button>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50">
              <h3 className="text-sm font-black text-slate-800 mb-6 flex items-center gap-2">💰 내 판매가 설정</h3>
              <div className="relative mb-6">
                <input type="number" value={myPrice || ''} onChange={(e) => setMyPrice(Number(e.target.value))} placeholder="판매중인 가격" className="w-full px-6 py-5 bg-slate-50 rounded-2xl border-2 border-transparent shadow-inner focus:border-[#03c75a] outline-none transition-all font-black text-2xl text-slate-800" />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-slate-300">원</span>
              </div>
              <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                <button onClick={() => setViewMode('table')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${viewMode === 'table' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}><List size={16} /> 테이블</button>
                <button onClick={() => setViewMode('grid')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}><LayoutGrid size={16} /> 그리드</button>
              </div>
            </div>

            {results.length > 0 && (
              <div className="space-y-3">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex justify-between items-center"><span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Market Min</span><span className="text-2xl font-black text-red-500">{stats.min.toLocaleString()}원</span></div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex justify-between items-center"><span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Market Avg</span><span className="text-2xl font-black text-slate-800">{stats.avg.toLocaleString()}원</span></div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-12">
          {error && <div className="p-4 rounded-2xl bg-red-50 text-red-500 text-sm font-bold text-center mb-8">{error}</div>}
          
          <AnimatePresence mode="wait">
            {results.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                {viewMode === 'table' ? (
                  <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-2xl shadow-slate-200/50">
                    <table className="w-full text-left">
                      <thead><tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product info</th>
                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Price</th>
                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Difference</th>
                      </tr></thead>
                      <tbody className="divide-y divide-slate-50">
                        {results.map((p) => {
                          const price = parseInt(String(p.price).replace(/[^0-9]/g, '')) || 0;
                          const diff = myPrice ? price - myPrice : 0;
                          return (
                            <tr key={p.id} className={`hover:bg-slate-50/50 transition-colors ${diff < 0 ? 'bg-red-50/20' : ''}`}>
                              <td className="px-8 py-5"><div className="flex items-center gap-4"><img src={p.image} className="w-12 h-12 rounded-xl object-cover bg-slate-100" /><div className="flex flex-col"><span className="font-bold text-sm text-slate-800 line-clamp-1 max-w-md">{p.title}</span><span className="text-[10px] font-black text-slate-400 uppercase">{p.mall}</span></div></div></td>
                              <td className="px-8 py-5 text-right font-black text-slate-900 text-lg">{p.price}원</td>
                              <td className="px-8 py-5 text-right">
                                {myPrice > 0 ? (
                                  <span className={`px-4 py-1.5 rounded-full font-black text-xs ${diff < 0 ? 'bg-red-100 text-red-600 shadow-lg shadow-red-100/50' : (diff > 0 ? 'bg-blue-100 text-blue-600 shadow-lg shadow-blue-100/50' : 'bg-slate-100 text-slate-400')}`}>
                                    {diff === 0 ? 'Matching' : (diff > 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString())}원
                                  </span>
                                ) : <span className="text-slate-200">---</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {results.map((p) => {
                      const price = parseInt(String(p.price).replace(/[^0-9]/g, '')) || 0;
                      const diff = myPrice ? price - myPrice : 0;
                      return (
                        <div key={p.id} className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm hover:shadow-xl transition-all group">
                          <img src={p.image} className="w-full aspect-square rounded-2xl object-cover mb-4 bg-slate-50" />
                          <h4 className="font-bold text-sm text-slate-800 line-clamp-2 h-10 mb-4">{p.title}</h4>
                          <div className="text-2xl font-black text-slate-900 mb-4">{p.price}원</div>
                          <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                            <span className="text-[10px] font-black text-slate-400 uppercase">{p.mall}</span>
                            {myPrice > 0 && diff < 0 && <span className="bg-red-500 text-white px-2 py-1 rounded-md text-[9px] font-black animate-pulse">LOWEST</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
