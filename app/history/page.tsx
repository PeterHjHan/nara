'use client';
import { useEffect, useState } from 'react';
import FavoriteButton from '@/components/FavoriteButton';

interface BidItem extends Record<string, unknown> {
  id: number;
  bizType: string;
  bidNtceNo: string;
  bidNtceOrd: string;
  createdAt: string;
  bidNtceNm?: string;
  ntceInsttNm?: string;
  presmptPrce?: string;
  asignBdgtAmt?: string;
  bidClseDt?: string;
  cntrctCnclsMthdNm?: string;
  sucsfbidMthdNm?: string;
}

const BIZ_TYPES = [
  { id: 'all', label: '전체' },
  { id: 'cnstwk', label: '공사' },
  { id: 'servc', label: '용역' },
  { id: 'thng', label: '물품' },
  { id: 'frgcpt', label: '외자' },
];

const SHOW_PAGE: Record<string, string> = {
  servc: '/bid/servc',
};

function fmtKRW(val: string | undefined) {
  if (!val) return '-';
  const n = Number(val);
  if (isNaN(n)) return val;
  return new Intl.NumberFormat('ko-KR').format(n) + '원';
}

export default function HistoryPage() {
  const [items, setItems] = useState<BidItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [favIds, setFavIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([
      fetch('/api/bid-items?limit=500').then(r => r.json()),
      fetch('/api/favorites').then(r => r.json()),
    ]).then(([bidData, favData]) => {
      setItems(bidData);
      setFavIds(new Set(favData.map((f: { itemId: string }) => f.itemId)));
    }).finally(() => setLoading(false));
  }, []);

  const filtered = items.filter(item => {
    if (filter !== 'all' && item.bizType !== filter) return false;
    if (keyword) {
      const kw = keyword.toLowerCase();
      return (
        item.bidNtceNm?.toLowerCase().includes(kw) ||
        item.ntceInsttNm?.toLowerCase().includes(kw) ||
        item.bidNtceNo?.toLowerCase().includes(kw)
      );
    }
    return true;
  });

  // Group by date
  const grouped: Record<string, BidItem[]> = {};
  for (const item of filtered) {
    const date = item.createdAt.slice(0, 10);
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(item);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900">공고 목록</h1>
        <div className="flex gap-2 flex-wrap items-center">
          <input
            type="text"
            placeholder="공고명·기관 검색..."
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {BIZ_TYPES.map(t => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${filter === t.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="text-center py-16 text-gray-400">불러오는 중...</div>}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-sm">검색된 공고가 없습니다. 먼저 검색을 실행해주세요.</p>
        </div>
      )}

      {Object.entries(grouped)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([date, dayItems]) => (
          <div key={date} className="mb-8">
            <h2 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
              <span className="h-px flex-1 bg-gray-200" />
              {date} · {dayItems.length}건
              <span className="h-px flex-1 bg-gray-200" />
            </h2>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-8">★</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">구분</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">공고번호</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[280px]">공고명</th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">추정가격</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">계약방법</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">공고기관</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">마감일시</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {dayItems
                      .sort((a, b) => Number(b.presmptPrce || b.asignBdgtAmt || 0) - Number(a.presmptPrce || a.asignBdgtAmt || 0))
                      .map((item) => {
                        const itemId = `${item.bidNtceNo}-${item.bidNtceOrd}`;
                        const showUrl = SHOW_PAGE[item.bizType]
                          ? `${SHOW_PAGE[item.bizType]}/${itemId}`
                          : undefined;
                        const g2bUrl = `https://www.g2b.go.kr/link/PNPE027_01/single/?bidPbancNo=${item.bidNtceNo}&bidPbancOrd=${item.bidNtceOrd}`;
                        const isFav = favIds.has(itemId);

                        return (
                          <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-3 py-3">
                              <FavoriteButton
                                apiType={`bid_${item.bizType}`}
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
                            <td className="px-3 py-3">
                              <span className="inline-block text-xs font-medium px-2 py-0.5 bg-blue-100 text-blue-700 rounded whitespace-nowrap">
                                {BIZ_TYPES.find(t => t.id === item.bizType)?.label ?? item.bizType}
                              </span>
                            </td>
                            <td className="px-3 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">
                              <a href={showUrl ?? g2bUrl} {...(!showUrl ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className="text-blue-600 hover:underline">
                                {item.bidNtceNo}
                              </a>
                            </td>
                            <td className="px-3 py-3 font-medium text-gray-900">
                              <a href={showUrl ?? g2bUrl} {...(!showUrl ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className="hover:text-blue-600 hover:underline line-clamp-2">
                                {item.bidNtceNm ?? '-'}
                              </a>
                            </td>
                            <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap text-right">
                              {fmtKRW(item.presmptPrce || item.asignBdgtAmt)}
                            </td>
                            <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">{item.cntrctCnclsMthdNm ?? '-'}</td>
                            <td className="px-3 py-3 text-xs text-gray-600 max-w-[160px] truncate">{item.ntceInsttNm ?? '-'}</td>
                            <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">{item.bidClseDt?.slice(0, 16) ?? '-'}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}
