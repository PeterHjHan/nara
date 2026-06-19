'use client';
import { useState } from 'react';
import FavoriteButton from '@/components/FavoriteButton';
import type { BizType, InqryDiv } from '@/lib/nara-api';

const BIZ_TYPES: { id: BizType; label: string; icon: string }[] = [
  { id: 'cnstwk', label: '공사', icon: '🏗️' },
  { id: 'servc',  label: '용역', icon: '🛠️' },
  { id: 'thng',   label: '물품', icon: '📦' },
  { id: 'frgcpt', label: '외자', icon: '🌐' },
];

const weekAgo = () => {
  const d = new Date(); d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10).replace(/-/g, '') + '0000';
};
const todayEnd = () => new Date().toISOString().slice(0, 10).replace(/-/g, '') + '2359';

function formatKRW(val: string | undefined) {
  if (!val) return '-';
  const n = Number(val);
  if (isNaN(n)) return val;
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(n);
}

function toDatetimeLocal(yymmddhhmm: string) {
  if (yymmddhhmm.length < 12) return '';
  return `${yymmddhhmm.slice(0,4)}-${yymmddhhmm.slice(4,6)}-${yymmddhhmm.slice(6,8)}T${yymmddhhmm.slice(8,10)}:${yymmddhhmm.slice(10,12)}`;
}

function fromDatetimeLocal(val: string) {
  return val.replace(/[-:T]/g, '').slice(0, 12);
}

export default function SearchPage() {
  const [bizType, setBizType] = useState<BizType>('cnstwk');
  const [inqryDiv, setInqryDiv] = useState<InqryDiv>('1');
  const [inqryBgnDt, setInqryBgnDt] = useState(weekAgo());
  const [inqryEndDt, setInqryEndDt] = useState(todayEnd());
  const [bidNtceNo, setBidNtceNo] = useState('');

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Record<string, string>[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [favIds, setFavIds] = useState<Set<string>>(new Set());

  const handleSearch = async () => {
    setLoading(true);
    setError('');
    setResults([]);
    setKeyword('');

    const params = {
      bizType,
      inqryDiv,
      ...(inqryDiv !== '2' ? { inqryBgnDt, inqryEndDt } : {}),
      ...(inqryDiv === '2' && bidNtceNo ? { bidNtceNo } : {}),
    };

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ params }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Search failed');
      const items: Record<string, string>[] = data.items ?? [];
      items.sort((a, b) => Number(b.presmptPrce || b.bdgtAmt || 0) - Number(a.presmptPrce || a.bdgtAmt || 0));
      setResults(items);
      setTotalCount(data.totalCount ?? 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const filtered = keyword
    ? results.filter(item => Object.values(item).some(v => v?.toLowerCase().includes(keyword.toLowerCase())))
    : results;

  const getItemId = (item: Record<string, string>) =>
    item.bidNtceNo ? `${item.bidNtceNo}-${item.bidNtceOrd ?? '000'}` : JSON.stringify(item).slice(0, 40);

  const getItemUrl = (item: Record<string, string>) =>
    item.bidNtceNo
      ? `https://www.g2b.go.kr/link/PNPE027_01/single/?bidPbancNo=${item.bidNtceNo}&bidPbancOrd=${item.bidNtceOrd ?? '000'}`
      : undefined;

  const getShowUrl = (item: Record<string, string>) => {
    if (!item.bidNtceNo) return undefined;
    const ord = item.bidNtceOrd ?? '000';
    if (bizType === 'servc') return `/bid/servc/${item.bidNtceNo}-${ord}`;
    return undefined;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Search Form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">검색 조건</h2>

            {/* Business type */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">업무구분</label>
              <div className="grid grid-cols-2 gap-1.5">
                {BIZ_TYPES.map(({ id, label, icon }) => (
                  <button
                    key={id}
                    onClick={() => setBizType(id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      bizType === id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    {icon} {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Query type */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">조회구분</label>
              <div className="space-y-1">
                {([['1', '등록일시'], ['2', '입찰공고번호'], ['3', '변경일시']] as [InqryDiv, string][]).map(([val, label]) => (
                  <label key={val} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${inqryDiv === val ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
                    <input type="radio" name="inqryDiv" value={val} checked={inqryDiv === val} onChange={() => setInqryDiv(val)} className="sr-only" />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {/* Date range (inqryDiv 1 or 3) */}
            {inqryDiv !== '2' && (
              <div className="space-y-3">
                <div className="text-xs text-gray-400 bg-gray-50 rounded p-2">
                  ※ 조회기간은 최대 1개월
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">시작일시</label>
                  <input
                    type="datetime-local"
                    value={toDatetimeLocal(inqryBgnDt)}
                    onChange={e => setInqryBgnDt(fromDatetimeLocal(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">종료일시</label>
                  <input
                    type="datetime-local"
                    value={toDatetimeLocal(inqryEndDt)}
                    onChange={e => setInqryEndDt(fromDatetimeLocal(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Bid notice number (inqryDiv 2) */}
            {inqryDiv === '2' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">입찰공고번호</label>
                <input
                  type="text"
                  value={bidNtceNo}
                  onChange={e => setBidNtceNo(e.target.value)}
                  placeholder="예: R25BK00932003"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            )}

            <button
              onClick={handleSearch}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? '검색 중...' : '검색'}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-3">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-red-700 text-sm">
              ⚠️ {error}
            </div>
          )}

          {results.length > 0 && (
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                전체 <span className="font-semibold text-gray-900">{totalCount.toLocaleString()}</span>건
                {keyword && ` (필터: ${filtered.length}건)`}
              </p>
              <input
                type="text"
                placeholder="결과 내 키워드 검색..."
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-60 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {results.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-8">★</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">공고번호</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[280px]">공고명</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">추정가격</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">계약방법</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">공고기관</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">공고일시</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">마감일시</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((item, i) => {
                      const itemId = getItemId(item);
                      const url = getItemUrl(item);
                      const isFav = favIds.has(itemId);
                      return (
                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                          <td className="px-3 py-3">
                            <FavoriteButton
                              apiType={`bid_${bizType}`}
                              itemId={itemId}
                              itemData={item}
                              initialFavorited={isFav}
                              onToggle={fav => setFavIds(prev => {
                                const s = new Set(prev);
                                fav ? s.add(itemId) : s.delete(itemId);
                                return s;
                              })}
                            />
                          </td>
                          <td className="px-3 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">
                            {url
                              ? <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{item.bidNtceNo}</a>
                              : item.bidNtceNo}
                          </td>
                          <td className="px-3 py-3 font-medium text-gray-900">
                            {(() => {
                              const showUrl = getShowUrl(item);
                              const label = <span className="line-clamp-2">{item.bidNtceNm}</span>;
                              if (showUrl) return <a href={showUrl} className="hover:text-blue-600 hover:underline line-clamp-2">{item.bidNtceNm}</a>;
                              if (url) return <a href={url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 hover:underline line-clamp-2">{item.bidNtceNm}</a>;
                              return label;
                            })()}
                          </td>
                          <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap text-right">{formatKRW(item.presmptPrce || item.bdgtAmt)}</td>
                          <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">{item.cntrctCnclsMthdNm}</td>
                          <td className="px-3 py-3 text-xs text-gray-600 max-w-[160px] truncate">{item.ntceInsttNm}</td>
                          <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">{item.bidNtceDt?.slice(0, 16)}</td>
                          <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">{item.bidClseDt?.slice(0, 16)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!loading && results.length === 0 && !error && (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">🔍</p>
              <p className="text-sm">업무구분과 조회조건을 선택하고 검색하세요.</p>
            </div>
          )}

          {loading && (
            <div className="text-center py-16 text-gray-400">
              <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm">나라장터 API 조회 중...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
