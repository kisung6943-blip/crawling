import React, { useState } from 'react';
import { Search, Loader2, Download, ExternalLink, Package, ShoppingBag, Truck, Store } from 'lucide-react';
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
        
        // 탭이나 콤마가 가장 많이 포함된 라인을 기준으로 구분자 결정
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
            
            // 컬럼 제목이 없는 경우를 위해 내용 기반으로 필드 유추
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
          const titleMatch = info.match(/[가-힣\w\s]{5,100}/); // 대략적인 제목 매칭
          
          return {
            image: img,
            title: titleMatch ? titleMatch[0].trim() : "상품명 없음",
            price: priceMatch ? (priceMatch[1] || priceMatch[2]) : "정보없음",
            shipping: shippingMatch ? shippingMatch[1] || shippingMatch[0] : "정보없음",
          };
        });
      }

      // 데이터 매핑 및 보정
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
    if (!keyword.trim()) {
      alert("먼저 검색 키워드를 입력해 주세요.");
      return;
    }
    const url = `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(keyword)}`;
    window.open(url, '_blank');
  };

  const exportToCSV = () => {
    if (results.length === 0) return;
    
    const headers = ['제목', '가격', '배송비', '판매점', '이미지URL'];
    const rows = results.map(p => [
      `"${String(p.title).replace(/"/g, '""')}"`,
      p.price,
      p.shipping,
      p.mall,
      p.image
    ]);
    
    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `naver_listly_${keyword || 'data'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#03c75a] rounded-xl flex items-center justify-center text-white shadow-lg shadow-green-500/20">
              <ShoppingBag size={24} />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl tracking-tight">Naver Smart Extractor</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold italic">Powered by Listly Logic</p>
            </div>
          </div>
          
          <button 
            onClick={exportToCSV}
            disabled={results.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <Download size={18} />
            <span className="hidden sm:inline">엑셀 다운로드</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-8">
        {/* How to use Guide */}
        <section className="mb-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold mb-3">1</div>
              <p className="text-sm font-bold text-slate-700">네이버 쇼핑에서 검색</p>
              <p className="text-xs text-slate-400 mt-1">키워드 입력 후 '검색창 열기' 클릭</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold mb-3">2</div>
              <p className="text-sm font-bold text-slate-700">리스틀리로 추출</p>
              <p className="text-xs text-slate-400 mt-1">확장프로그램 실행 후 '데이터 복사'</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
              <div className="w-10 h-10 bg-[#03c75a] text-white rounded-full flex items-center justify-center font-bold mb-3">3</div>
              <p className="text-sm font-bold text-slate-700">여기에 붙여넣기</p>
              <p className="text-xs text-slate-400 mt-1">아래 입력창에 Ctrl+V 하세요</p>
            </div>
          </div>
        </section>

        {/* Action Section */}
        <section className="mb-12">
          <div className="max-w-3xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="검색 키워드 (예: 휘슬러 고무패킹)"
                  className="w-full pl-12 pr-4 py-4 bg-white rounded-xl border-2 border-slate-100 outline-none focus:border-[#03c75a] transition-all"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              </div>
              <button
                onClick={openNaver}
                className="px-6 py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
              >
                <ExternalLink size={18} />
                네이버 검색창 열기
              </button>
            </div>

            <div className="relative group">
              <textarea
                onChange={handlePaste}
                placeholder="리스틀리에서 복사한 데이터를 여기에 붙여넣으세요 (Ctrl+V)..."
                className="w-full h-40 p-6 bg-white rounded-2xl border-2 border-dashed border-slate-200 shadow-inner focus:border-[#03c75a] focus:ring-4 focus:ring-green-500/5 outline-none transition-all resize-none text-slate-600"
              />
              <div className="absolute right-4 bottom-4 flex items-center gap-2 text-slate-300 group-focus-within:text-[#03c75a] transition-colors pointer-events-none">
                <Package size={20} />
                <span className="text-sm font-bold uppercase tracking-wider">Paste Listly Data</span>
              </div>
            </div>
          </div>
        </section>

        {/* Results Section */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-center mb-8"
            >
              {error}
            </motion.div>
          )}

          {results.length > 0 ? (
            <motion.div
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              {results.map((product, idx) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl transition-all group"
                >
                  <div className="aspect-[4/3] bg-slate-50 relative overflow-hidden">
                    {product.image ? (
                      <img 
                        src={product.image} 
                        alt={product.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <Package size={48} />
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      <div className="bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-[10px] font-bold text-slate-700 shadow-sm border border-slate-100">
                        ITEM #{idx + 1}
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-5">
                    <h3 className="font-semibold text-slate-900 line-clamp-2 mb-3 h-10 group-hover:text-[#03c75a] transition-colors leading-relaxed">
                      {product.title}
                    </h3>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xl font-bold text-slate-900">{product.price}원</div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 pt-2">
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-50 text-[11px] font-medium text-[#03c75a] border border-green-100/50">
                          <Truck size={12} />
                          {product.shipping}
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-50 text-[11px] font-medium text-slate-600 border border-slate-100">
                          <Store size={12} />
                          {product.mall}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : !isLoading && keyword && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-100 rounded-full text-slate-400 mb-4">
                <Search size={32} />
              </div>
              <p className="text-slate-500">결과가 없습니다. 다른 키워드로 검색해보세요.</p>
            </motion.div>
          )}

          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 h-80 overflow-hidden">
                  <div className="h-44 bg-slate-100" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 bg-slate-100 rounded w-3/4" />
                    <div className="h-4 bg-slate-100 rounded w-1/2" />
                    <div className="h-8 bg-slate-100 rounded w-full mt-4" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Info */}
      <footer className="mt-20 py-10 border-t border-slate-100 text-center text-slate-400 text-sm">
        <p>&copy; 2026 Naver Smart Extractor. Designed for Data Efficiency.</p>
      </footer>
    </div>
  );
}
