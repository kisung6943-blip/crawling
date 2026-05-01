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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/scrape?q=${encodeURIComponent(keyword)}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setResults(data.results || []);
    } catch (err) {
      setError('데이터를 가져오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = () => {
    if (results.length === 0) return;
    
    const headers = ['제목', '가격', '배송비', '판매점', '이미지URL'];
    const rows = results.map(p => [
      `"${p.title.replace(/"/g, '""')}"`,
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
    link.setAttribute("download", `naver_extract_${keyword}.csv`);
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
        {/* Search Section */}
        <section className="mb-12">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-display font-extrabold mb-4 text-slate-900 leading-tight">
              네이버 쇼핑 데이터를 <span className="text-[#03c75a]">한 번에</span> 추출하세요
            </h2>
            <p className="text-slate-500 mb-8 max-w-lg mx-auto">
              키워드를 입력하면 이미지, 제목, 가격, 배송비, 판매처를 한 번에 수집하여 정리해드립니다.
            </p>
            
            <form onSubmit={handleSearch} className="relative group">
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="검색할 상품 키워드를 입력하세요..."
                className="w-full pl-14 pr-32 py-5 bg-white rounded-2xl border-2 border-slate-100 shadow-xl focus:border-[#03c75a] focus:ring-4 focus:ring-green-500/5 outline-none transition-all text-lg"
              />
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#03c75a] transition-colors" size={24} />
              <button
                type="submit"
                disabled={isLoading}
                className="absolute right-3 top-1/2 -translate-y-1/2 naver-btn h-12 flex items-center justify-center min-w-[100px]"
              >
                {isLoading ? <Loader2 className="animate-spin" /> : '추출하기'}
              </button>
            </form>
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
