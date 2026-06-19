'use client';
import { useEffect, useState } from 'react';

interface Session {
  id: number;
  apiType: string;
  searchParams: Record<string, string>;
  resultCount: number;
  results: Record<string, unknown>[];
  searchedAt: string;
}

const apiTypeLabel: Record<string, string> = {
  bid_cnstwk: '공사',
  bid_servc:  '용역',
  bid_thng:   '물품',
  bid_frgcpt: '외자',
};

const bsnsDivLabel: Record<string, string> = { '1': '물품', '2': '외자', '3': '공사', '5': '용역' };

function formatParams(apiType: string, params: Record<string, string>) {
  if (apiType === 'bid') {
    const from = params.bidNtceBgnDt?.slice(0, 8);
    const to = params.bidNtceEndDt?.slice(0, 8);
    return `${from} ~ ${to}`;
  }
  if (apiType === 'successful_bid') {
    const type = bsnsDivLabel[params.bsnsDivCd] ?? params.bsnsDivCd;
    const from = params.opengBgnDt?.slice(0, 8);
    const to = params.opengEndDt?.slice(0, 8);
    return `${type} | ${from} ~ ${to}`;
  }
  const from = params.cntrctCnclsBgnDate;
  const to = params.cntrctCnclsEndDate;
  return `${from} ~ ${to}${params.insttCd ? ` | 기관: ${params.insttCd}` : ''}`;
}

function getFirstItemName(results: Record<string, unknown>[]) {
  if (!results.length) return null;
  const first = results[0];
  return String(first.bidNtceNm ?? first.cntrctNm ?? first.bidNtceNo ?? '');
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [filter, setFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    fetch('/api/history?limit=100').then(r => r.json()).then(setSessions).finally(() => setLoading(false));
  }, []);

  const filtered = sessions.filter(s => {
    if (filter !== 'all' && !s.apiType.includes(filter)) return false;
    if (dateFilter && !s.searchedAt.startsWith(dateFilter)) return false;
    return true;
  });

  // Group by date
  const grouped: Record<string, Session[]> = {};
  for (const s of filtered) {
    const date = s.searchedAt.slice(0, 10);
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(s);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900">검색 기록</h1>
        <div className="flex gap-2 flex-wrap">
          <input
            type="date"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {['all', 'cnstwk', 'servc', 'thng', 'frgcpt'].map(t => (
            <button key={t} onClick={() => setFilter(t)} className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${filter === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {t === 'all' ? '전체' : (apiTypeLabel[`bid_${t}`] ?? t)}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="text-center py-16 text-gray-400">불러오는 중...</div>}

      {!loading && Object.keys(grouped).length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📅</p>
          <p className="text-sm">검색 기록이 없습니다.</p>
        </div>
      )}

      {Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a)).map(([date, list]) => (
        <div key={date} className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
            <span className="h-px flex-1 bg-gray-200" />
            {date}
            <span className="h-px flex-1 bg-gray-200" />
          </h2>
          <div className="space-y-2">
            {list.map(s => (
              <div key={s.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-medium px-2 py-0.5 bg-blue-100 text-blue-700 rounded shrink-0">{apiTypeLabel[s.apiType]}</span>
                    <span className="text-xs text-gray-400 shrink-0">{s.searchedAt.slice(11, 16)}</span>
                    <span className="text-sm text-gray-700 truncate">{formatParams(s.apiType, s.searchParams)}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-medium text-gray-900">{s.resultCount.toLocaleString()}건</span>
                    <span className="text-gray-400 text-xs">{expanded === s.id ? '▲' : '▼'}</span>
                  </div>
                </div>

                {expanded === s.id && (
                  <div className="border-t border-gray-100 overflow-x-auto">
                    {s.results.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-gray-400">결과 없음</p>
                    ) : (
                      <table className="w-full text-xs">
                        <tbody className="divide-y divide-gray-50">
                          {s.results.slice(0, 20).map((item, i) => {
                            const name = String(item.bidNtceNm ?? item.cntrctNm ?? item.bidNtceNo ?? item.cntrctNo ?? '');
                            const url = item.bidNtceUrl as string | undefined ??
                              (item.bidNtceNo ? `https://www.g2b.go.kr/link/PNPE027_01/single/?bidPbancNo=${item.bidNtceNo}&bidPbancOrd=${item.bidNtceOrd ?? '000'}` : undefined);
                            return (
                              <tr key={i} className="hover:bg-gray-50">
                                <td className="px-4 py-2 text-gray-400 w-8">{i + 1}</td>
                                <td className="px-4 py-2 font-medium text-gray-800">
                                  {url ? <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{name}</a> : name}
                                </td>
                                <td className="px-4 py-2 text-gray-500">{String(item.bsnsDivNm ?? '')}</td>
                                <td className="px-4 py-2 text-gray-500">{String(item.ntceInsttNm ?? item.cntrctInsttNm ?? '')}</td>
                              </tr>
                            );
                          })}
                          {s.results.length > 20 && (
                            <tr><td colSpan={4} className="px-4 py-2 text-gray-400">...외 {s.results.length - 20}건</td></tr>
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
