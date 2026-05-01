import React, { useState } from 'react';
import { Search, Loader2, Download, ExternalLink, Package, ShoppingBag, Truck, Store, LayoutGrid, List } from 'lucide-react';
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
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
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
    if (!apiKey.trim()) {
      setError("API 키가 필요합니다.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      const response = await fetch(`/api/listly?q=${encodeURIComponent(keyword)}&api_key=${apiKey}`);
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Re-use the existing paste logic's mapper
      processData(data.results);
    } catch (err: any) {
      setError(err.message || "자동 추출 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const processData = (rawData: any[]) => {
    const mappedProducts: Product[] = rawData.map((item: any, idx: number) => {
      const keys = Object.keys(item);
      const findValue = (regex: RegExp, fallback: any = "") => {
        const key = keys.find(k => regex.test(k));
        return key ? String(item[key]).trim() : fallback;
      };

      let imgSrc = findValue(/이미지|사진|image|thumb|src|img/i, item.image);
      if (imgSrc && imgSrc.startsWith('//')) imgSrc = 'https:' + imgSrc;

      return {
        id: idx,
        image: imgSrc,
        title: findValue(/제목|상품명|명칭|title|name|text/i, item.title),
        price: findValue(/가격|금액|원|price|cost/i, item.price),
        shipping: findValue(/배송|택배|운임|shipping|delivery/i, item.shipping) || "정보없음",
        mall: findValue(/판매처|스토어|몰|mall|seller|source/i, item.mall) || "네이버페이"
      };
    }).filter(p => p.title && p.title.length > 2);

    if (mappedProducts.length > 0) {
      setResults(mappedProducts);
      setError(null);
    } else {
      setError("검색 결과를 찾을 수 없습니다.");
    }
  };

  const handlePaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value.trim();
    if (!value) return;

    try {
      let parsedData: any[] = [];
      
      // 1. JSON 형태 시도
      if (value.startsWith('[') || value.startsWith('{')) {
        try {
          const json = JSON.parse(value);
          parsedData = Array.isArray(json) ? json : (json.data || Object.values(json)[0] || []);
        } catch (e) { }
      } 
      
      // 2. Tab/Comma 구분자 기반 시도 (전체 텍스트에서 최적의 구분자 검색)
      if (parsedData.length === 0) {
        const lines = value.split(/\r?\n/).filter(l => l.trim().length > 5);
        let maxTabs = 0;
        let maxCommas = 0;
        lines.forEach(l => {
          maxTabs = Math.max(maxTabs, (l.match(/\t/g) || []).length);
          maxCommas = Math.max(maxCommas, (l.match(/,/g) || []).length);
        });
        
        const delimiter = maxTabs >= 2 ? '\t' : (maxCommas >= 2 ? ',' : null);
        
        if (delimiter) {
          parsedData = lines.map(line => {
            const cells = line.split(delimiter).map(c => c.trim().replace(/"/g, ''));
            const obj: any = {};
            cells.forEach(cell => {
              if (cell.match(/^https?:\/\/.*?\.(jpg|jpeg|png|gif|webp)/i)) obj.image = cell;
              else if (cell.match(/^https?:\/\//i) && !obj.link) obj.link = cell;
              else if (cell.includes('원') || cell.match(/^[\d,]+$/)) {
                if (!obj.price || obj.price.length < cell.length) obj.price = cell;
              }
              else if (cell.includes('배송비')) obj.shipping = cell;
              else if (cell.includes('몰') || cell.includes('점') || cell.includes('판매처')) obj.mall = cell;
              else if (cell.length > 5 && !obj.title) obj.title = cell;
            });
            return obj;
          });
        }
      }

      // 3. 지능형 패턴 추출 (이미지 URL 중심)
      if (parsedData.length === 0 || parsedData.every(d => !d.title)) {
        const regex = /(https?:\/\/[^\s\t\n]+(?:\.jpg|\.png|\.gif|\.jpeg)[^\s\t\n]*)/gi;
        const images = value.match(regex) || [];
        const textParts = value.split(regex);
        
        parsedData = images.map((img, i) => {
          const info = textParts[i + 1] || "";
          const priceMatch = info.match(/([\d,]+)원|최저\s*([\d,]+)/);
          const shippingMatch = info.match(/배송비\s*([\d,]+원|무료|[\d,]+)/);
          const titleMatch = info.match(/[가-힣\w\s]{5,100}/);
          
          return {
            image: img,
            title: titleMatch ? titleMatch[0].trim() : "상품명 없음",
            price: priceMatch ? (priceMatch[1] || priceMatch[2]) : "정보없음",
            shipping: shippingMatch ? shippingMatch[1] || shippingMatch[0] : "정보없음",
          };
        });
      }

      const mappedProducts: Product[] = parsedData
        .filter(item => item.image || item.title)
        .map((item: any, idx: number) => {
          const findValue = (regex: RegExp, fallback: any = "") => {
            const key = Object.keys(item).find(k => regex.test(k));
            return key ? String(item[key]).trim() : fallback;
          };

          let imgSrc = findValue(/이미지|사진|image|thumb|src|img/i, item.image);
          if (imgSrc && imgSrc.startsWith('//')) imgSrc = 'https:' + imgSrc;

          return {
            id: idx,
            image: imgSrc,
            title: findValue(/제목|상품명|명칭|title|name|text/i, item.title),
            price: findValue(/가격|금액|원|price|cost/i, item.price),
            shipping: findValue(/배송|택배|운임|shipping|delivery/i, item.shipping) || "정보없음",
            mall: findValue(/판매처|스토어|몰|mall|seller|source/i, item.mall) || "네이버페이"
          };
        })
        .filter(p => p.title && p.title.length > 2);

      if (mappedProducts.length > 0) {
        setResults(mappedProducts);
        setError(null);
      } else {
        setError("유효한 상품 정보를 찾을 수 없습니다. 리스틀리에서 데이터를 다시 복사해 주세요.");
      }
    } catch (err) {
      console.error("Paste error:", err);
      setError("데이터 분석 중 오류가 발생했습니다.");
    }
  };

  const openNaver = () => {
    if (!keyword.trim()) return;
    window.open(`https://search.shopping.naver.com/search/all?query=${encodeURIComponent(keyword)}`, '_blank');
  };

  const exportToCSV = () => {
    if (results.length === 0) return;
    const headers = ['제목', '가격', '배송비', '판매점', '이미지URL'];
    const rows = results.map(p => [`"${String(p.title).replace(/"/g, '""')}"`, p.price, p.shipping, p.mall, p.image]);
    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `naver_listly_${keyword || 'data'}.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen pb-20 bg-slate-50">
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#03c75a] rounded-xl flex items-center justify-center text-white shadow-lg">
              <ShoppingBag size={24} />
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tight">Price Comparison Dashboard</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold italic">Market Intelligence Tool</p>
            </div>
          </div>
          <button onClick={exportToCSV} disabled={results.length === 0} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-20 transition-all">
            <Download size={18} /> <span className="hidden sm:inline text-sm font-bold">엑셀 다운로드</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-8">
        <section className="mb-12">
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="검색 키워드 입력" className="w-full pl-10 pr-4 py-4 bg-white rounded-2xl border-2 border-transparent shadow-sm focus:border-[#03c75a] outline-none transition-all" />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                </div>
                <button 
                  onClick={handleAutoSearch} 
                  disabled={isLoading}
                  className="px-6 py-4 bg-[#03c75a] text-white rounded-2xl font-black hover:bg-[#02a64a] disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg shadow-green-500/20"
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : <ShoppingBag size={20} />}
                  자동 추출
                </button>
                <button onClick={openNaver} className="p-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center"><ExternalLink size={20} /></button>
              </div>
              <div className="relative group">
                <textarea onChange={handlePaste} placeholder="또는 리스틀리 수동 복사본을 여기에 붙여넣으세요..." className="w-full h-32 p-6 bg-white rounded-2xl border-2 border-dashed border-slate-200 shadow-inner focus:border-[#03c75a] outline-none transition-all resize-none text-xs text-slate-600" />
                {isLoading && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-3">
                    <Loader2 className="animate-spin text-[#03c75a]" size={32} />
                    <p className="text-xs font-bold text-slate-500">리스틀리가 네이버에서 수집 중입니다 (약 10초)...</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-[#03c75a]/5 border border-[#03c75a]/20 p-6 rounded-3xl relative overflow-hidden">
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-[#03c75a]/10 rounded-full" />
                <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">🛒 내 판매가 설정</h3>
                <input type="number" value={myPrice || ''} onChange={(e) => setMyPrice(Number(e.target.value))} placeholder="판매중인 가격 입력" className="w-full px-5 py-4 bg-white rounded-2xl border-2 border-transparent shadow-sm focus:border-[#03c75a] outline-none transition-all font-black text-xl" />
                <div className="flex bg-white p-1 rounded-xl border border-slate-200 mt-4 shadow-sm">
                  <button onClick={() => setViewMode('table')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${viewMode === 'table' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}><List size={14} /> 표 보기</button>
                  <button onClick={() => setViewMode('grid')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${viewMode === 'grid' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}><LayoutGrid size={14} /> 카드 보기</button>
                </div>
              </div>
              {results.length > 0 && (
                <div className="grid grid-cols-1 gap-3">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center"><span className="text-xs font-bold text-slate-400">시장 최저가</span><span className="text-xl font-black text-red-500">{stats.min.toLocaleString()}원</span></div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center"><span className="text-xs font-bold text-slate-400">평균가</span><span className="text-xl font-black text-slate-800">{stats.avg.toLocaleString()}원</span></div>
                </div>
              )}
            </div>
          </div>
        </section>

        <AnimatePresence mode="wait">
          {error && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-center mb-8 text-sm font-medium">{error}</motion.div>}

          {results.length > 0 ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {results.map((product, idx) => {
                  const price = parseInt(String(product.price).replace(/[^0-9]/g, '')) || 0;
                  const diff = myPrice ? price - myPrice : 0;
                  return (
                    <div key={product.id} className={`bg-white rounded-3xl border ${diff < 0 ? 'border-red-500 ring-4 ring-red-50' : 'border-slate-100'} overflow-hidden shadow-sm transition-all group`}>
                      <div className="aspect-square relative overflow-hidden bg-slate-50">
                        <img src={product.image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        {myPrice > 0 && diff < 0 && <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1.5 rounded-full text-[10px] font-black shadow-xl animate-pulse">-${Math.abs(diff).toLocaleString()}원</div>}
                      </div>
                      <div className="p-6">
                        <h3 className="font-bold text-slate-900 text-sm line-clamp-2 h-10 mb-4">{product.title}</h3>
                        <div className="text-2xl font-black text-slate-900 mb-4">{product.price}원</div>
                        <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                          <span className="text-[10px] font-black bg-slate-100 px-2 py-1 rounded text-slate-500">{product.mall}</span>
                          <span className="text-[10px] text-slate-400 font-bold">{product.shipping}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xl">
                <table className="w-full text-left border-collapse">
                  <thead><tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">상품명</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">경쟁사 가격</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">가격 차이 (내 기준)</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">판매처</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {results.map((product) => {
                      const price = parseInt(String(product.price).replace(/[^0-9]/g, '')) || 0;
                      const diff = myPrice ? price - myPrice : 0;
                      return (
                        <tr key={product.id} className={`hover:bg-slate-50 transition-colors ${diff < 0 ? 'bg-red-50/40' : ''}`}>
                          <td className="px-6 py-4"><div className="flex items-center gap-4"><img src={product.image} className="w-10 h-10 rounded-lg object-cover" /><span className="font-bold text-sm text-slate-800 line-clamp-1 max-w-md">{product.title}</span></div></td>
                          <td className="px-6 py-4 text-right font-black text-slate-900 text-lg">{product.price}원</td>
                          <td className="px-6 py-4 text-right">
                            {myPrice > 0 ? (
                              <span className={`px-3 py-1 rounded-full font-black text-xs ${diff < 0 ? 'bg-red-100 text-red-600' : (diff > 0 ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400')}`}>
                                {diff === 0 ? '동일가' : (diff > 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString())}원
                              </span>
                            ) : <span className="text-slate-300">-</span>}
                          </td>
                          <td className="px-6 py-4 text-center"><span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2.5 py-1.5 rounded-lg">{product.mall}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : null}
        </AnimatePresence>
      </main>
    </div>
  );
}
