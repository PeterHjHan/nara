'use client';
import { useEffect, useState } from 'react';

interface Favorite {
  id: number;
  apiType: string;
  itemId: string;
  itemData: Record<string, unknown>;
  createdAt: string;
}

const apiTypeLabel: Record<string, string> = {
  bid_cnstwk: '공사',
  bid_servc:  '용역',
  bid_thng:   '물품',
  bid_frgcpt: '외자',
};

function formatKRW(val: unknown) {
  const n = Number(val);
  if (!val || isNaN(n)) return '-';
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(n);
}

function getItemName(f: Favorite) {
  const d = f.itemData;
  return String(d.bidNtceNm ?? d.cntrctNm ?? d.bidNtceNo ?? d.cntrctNo ?? '(이름 없음)');
}

const SHOW_PAGE: Record<string, string> = {
  bid_servc: '/bid/servc',
};

function getItemUrl(f: Favorite): { href: string; external: boolean } | null {
  const d = f.itemData;
  const no = d.bidNtceNo ? String(d.bidNtceNo) : null;
  const ord = d.bidNtceOrd ? String(d.bidNtceOrd) : '000';
  if (no && SHOW_PAGE[f.apiType]) return { href: `${SHOW_PAGE[f.apiType]}/${no}-${ord}`, external: false };
  if (no) return { href: `https://www.g2b.go.kr/link/PNPE027_01/single/?bidPbancNo=${no}&bidPbancOrd=${ord}`, external: true };
  return null;
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetch('/api/favorites').then(r => r.json()).then(setFavorites).finally(() => setLoading(false));
  }, []);

  const removeFavorite = async (apiType: string, itemId: string) => {
    await fetch('/api/favorites', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiType, itemId }),
    });
    setFavorites(prev => prev.filter(f => !(f.apiType === apiType && f.itemId === itemId)));
  };

  const filtered = filter === 'all' ? favorites : favorites.filter(f => f.apiType === filter);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">즐겨찾기</h1>
        <div className="flex gap-2">
          {(['all', 'bid_cnstwk', 'bid_servc', 'bid_thng', 'bid_frgcpt'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${filter === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {t === 'all' ? '전체' : (apiTypeLabel[t] ?? t)}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="text-center py-16 text-gray-400">불러오는 중...</div>}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">⭐</p>
          <p className="text-sm">즐겨찾기한 항목이 없습니다.</p>
          <p className="text-xs mt-1">검색 결과에서 ☆를 클릭하여 추가하세요.</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(f => {
          const name = getItemName(f);
          const url = getItemUrl(f);

          return (
            <div key={f.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium px-2 py-0.5 bg-blue-100 text-blue-700 rounded">{apiTypeLabel[f.apiType] ?? f.apiType}</span>
                  <span className="text-xs text-gray-400">{f.createdAt?.slice(0, 10)}</span>
                </div>
                {url ? (
                  <a href={url.href} {...(url.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className="font-medium text-gray-900 hover:text-blue-600 hover:underline line-clamp-2">
                    {name}
                  </a>
                ) : (
                  <p className="font-medium text-gray-900 line-clamp-2">{name}</p>
                )}
                <div className="mt-1 flex gap-3 text-xs text-gray-500 flex-wrap">
                  {f.itemData.bsnsDivNm ? <span>📂 {String(f.itemData.bsnsDivNm)}</span> : null}
                  {f.itemData.ntceInsttNm ? <span>🏢 {String(f.itemData.ntceInsttNm)}</span> : null}
                  {f.itemData.cntrctInsttNm ? <span>🏢 {String(f.itemData.cntrctInsttNm)}</span> : null}
                  {(f.itemData.presmptPrce ?? f.itemData.cntrctAmt ?? f.itemData.scsbidAmt) ? (
                    <span>💰 {formatKRW(f.itemData.presmptPrce ?? f.itemData.cntrctAmt ?? f.itemData.scsbidAmt)}</span>
                  ) : null}
                </div>
              </div>
              <button
                onClick={() => removeFavorite(f.apiType, f.itemId)}
                className="text-red-400 hover:text-red-600 text-lg shrink-0"
                title="즐겨찾기 해제"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
