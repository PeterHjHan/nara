'use client';
import { useState, useCallback } from 'react';
import FavoriteButton from '@/components/FavoriteButton';

type ApiType = 'bid' | 'successful_bid' | 'contract';

const today = () => new Date().toISOString().split('T')[0];
const todayYMDHHMM = () => today().replace(/-/g, '') + '0000';
const todayYMDHHMM2359 = () => today().replace(/-/g, '') + '2359';
const weekAgoYMDHHMM = () => {
  const d = new Date(); d.setDate(d.getDate() - 7);
  return d.toISOString().split('T')[0].replace(/-/g, '') + '0000';
};
const weekAgoYMD = () => {
  const d = new Date(); d.setDate(d.getDate() - 7);
  return d.toISOString().split('T')[0].replace(/-/g, '');
};
const todayYMD = () => today().replace(/-/g, '');

function formatKRW(val: string | number | undefined) {
  if (!val) return '-';
  const n = Number(val);
  if (isNaN(n)) return String(val);
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(n);
}

const BSNS_DIV = [
  { code: '1', label: '물품' },
  { code: '3', label: '공사' },
  { code: '5', label: '용역' },
  { code: '2', label: '외자' },
];

export default function SearchPage() {
  const [activeTab, setActiveTab] = useState<ApiType>('bid');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Record<string, unknown>[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [favIds, setFavIds] = useState<Set<string>>(new Set());

  // Bid form state
  const [bidParams, setBidParams] = useState({
    bidNtceBgnDt: weekAgoYMDHHMM(),
    bidNtceEndDt: todayYMDHHMM2359(),
  });

  // Successful bid form state
  const [sbParams, setSbParams] = useState({
    bsnsDivCd: '1',
    opengBgnDt: weekAgoYMDHHMM(),
    opengEndDt: todayYMDHHMM2359(),
  });

  // Contract form state
  const [ctParams, setCtParams] = useState({
    cntrctCnclsBgnDate: weekAgoYMD(),
    cntrctCnclsEndDate: todayYMD(),
    insttDivCd: '',
    insttCd: '',
  });

  const getParams = () => {
    if (activeTab === 'bid') return bidParams;
    if (activeTab === 'successful_bid') return sbParams;
    return ctParams;
  };

  const handleSearch = async () => {
    setLoading(true);
    setError('');
    setResults([]);
    setKeyword('');
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiType: activeTab, params: getParams() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Search failed');
      setResults(data.items ?? []);
      setTotalCount(data.totalCount ?? 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const filteredResults = keyword
    ? results.filter(item =>
        Object.values(item).some(v => String(v ?? '').toLowerCase().includes(keyword.toLowerCase()))
      )
    : results;

  const getItemId = (item: Record<string, unknown>): string => {
    return String(item.bidNtceNo ?? item.cntrctNo ?? item.id ?? JSON.stringify(item).slice(0, 40));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {([
          { id: 'bid' as ApiType, label: '입찰공고' },
          { id: 'successful_bid' as ApiType, label: '낙찰정보' },
          { id: 'contract' as ApiType, label: '계약정보' },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setResults([]); setError(''); }}
            className={`px-5 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-700 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Search Form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">검색 조건</h2>

            {activeTab === 'bid' && (
              <BidForm params={bidParams} onChange={setBidParams} />
            )}
            {activeTab === 'successful_bid' && (
              <SuccessfulBidForm params={sbParams} onChange={setSbParams} />
            )}
            {activeTab === 'contract' && (
              <ContractForm params={ctParams} onChange={setCtParams} />
            )}

            <button
              onClick={handleSearch}
              disabled={loading}
              className="mt-4 w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
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
                전체 <span className="font-semibold text-gray-900">{totalCount.toLocaleString()}</span>건 (표시: {filteredResults.length}건)
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

          {activeTab === 'bid' && results.length > 0 && (
            <BidResultsTable items={filteredResults} favIds={favIds} setFavIds={setFavIds} getItemId={getItemId} />
          )}
          {activeTab === 'successful_bid' && results.length > 0 && (
            <SBResultsTable items={filteredResults} favIds={favIds} setFavIds={setFavIds} getItemId={getItemId} />
          )}
          {activeTab === 'contract' && results.length > 0 && (
            <ContractResultsTable items={filteredResults} favIds={favIds} setFavIds={setFavIds} getItemId={getItemId} />
          )}

          {!loading && results.length === 0 && !error && (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">🔍</p>
              <p className="text-sm">검색 조건을 입력하고 검색 버튼을 누르세요.</p>
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

// ─── Sub-forms ───────────────────────────────────────────────────────────────

function DateTimeInput({ label, value, onChange, format = 'datetime' }: {
  label: string; value: string; onChange: (v: string) => void; format?: 'datetime' | 'date';
}) {
  const display = format === 'datetime'
    ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)} ${value.slice(8, 10)}:${value.slice(10, 12)}`
    : `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;

  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={format === 'datetime' ? 'datetime-local' : 'date'}
        value={format === 'datetime'
          ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(8, 10)}:${value.slice(10, 12)}`
          : `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`}
        onChange={e => {
          const v = e.target.value;
          if (format === 'datetime') {
            onChange(v.replace(/[-:T]/g, '').slice(0, 12));
          } else {
            onChange(v.replace(/-/g, ''));
          }
        }}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

function BidForm({ params, onChange }: { params: typeof defaultBidParams; onChange: (p: typeof defaultBidParams) => void }) {
  return (
    <>
      <div className="text-xs text-gray-400 mb-3 bg-gray-50 rounded p-2">
        ※ 입찰공고일시 범위는 최대 1개월
      </div>
      <DateTimeInput label="공고 시작일시" value={params.bidNtceBgnDt} onChange={v => onChange({ ...params, bidNtceBgnDt: v })} />
      <DateTimeInput label="공고 종료일시" value={params.bidNtceEndDt} onChange={v => onChange({ ...params, bidNtceEndDt: v })} />
    </>
  );
}

const defaultBidParams = { bidNtceBgnDt: '', bidNtceEndDt: '' };

function SuccessfulBidForm({ params, onChange }: { params: { bsnsDivCd: string; opengBgnDt: string; opengEndDt: string }; onChange: (p: typeof params) => void }) {
  return (
    <>
      <div className="text-xs text-gray-400 mb-3 bg-gray-50 rounded p-2">
        ※ 개찰일시 범위는 최대 1주일
      </div>
      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-600 mb-1">업무구분 (필수)</label>
        <div className="grid grid-cols-2 gap-1">
          {BSNS_DIV.map(({ code, label }) => (
            <label key={code} className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border cursor-pointer text-sm transition-colors ${params.bsnsDivCd === code ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'}`}>
              <input type="radio" name="bsnsDivCd" value={code} checked={params.bsnsDivCd === code} onChange={() => onChange({ ...params, bsnsDivCd: code })} className="sr-only" />
              {label}
            </label>
          ))}
        </div>
      </div>
      <DateTimeInput label="개찰 시작일시" value={params.opengBgnDt} onChange={v => onChange({ ...params, opengBgnDt: v })} />
      <DateTimeInput label="개찰 종료일시" value={params.opengEndDt} onChange={v => onChange({ ...params, opengEndDt: v })} />
    </>
  );
}

function ContractForm({ params, onChange }: { params: { cntrctCnclsBgnDate: string; cntrctCnclsEndDate: string; insttDivCd: string; insttCd: string }; onChange: (p: typeof params) => void }) {
  return (
    <>
      <div className="text-xs text-gray-400 mb-3 bg-gray-50 rounded p-2">
        ※ 계약체결일자 범위는 최대 1주일
      </div>
      <DateTimeInput label="계약체결 시작일자" value={params.cntrctCnclsBgnDate} onChange={v => onChange({ ...params, cntrctCnclsBgnDate: v })} format="date" />
      <DateTimeInput label="계약체결 종료일자" value={params.cntrctCnclsEndDate} onChange={v => onChange({ ...params, cntrctCnclsEndDate: v })} format="date" />
      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-600 mb-1">기관구분 (선택)</label>
        <select value={params.insttDivCd} onChange={e => onChange({ ...params, insttDivCd: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">전체</option>
          <option value="1">계약기관</option>
          <option value="2">수요기관</option>
        </select>
      </div>
      {params.insttDivCd && (
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">기관코드 (선택)</label>
          <input type="text" value={params.insttCd} onChange={e => onChange({ ...params, insttCd: e.target.value })} placeholder="예: 4490000" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      )}
    </>
  );
}

// ─── Results Tables ───────────────────────────────────────────────────────────

interface TableProps {
  items: Record<string, unknown>[];
  favIds: Set<string>;
  setFavIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  getItemId: (item: Record<string, unknown>) => string;
}

function Badge({ text, color = 'gray' }: { text: string; color?: 'gray' | 'blue' | 'green' | 'red' | 'yellow' }) {
  const colors = { gray: 'bg-gray-100 text-gray-700', blue: 'bg-blue-100 text-blue-700', green: 'bg-green-100 text-green-700', red: 'bg-red-100 text-red-700', yellow: 'bg-yellow-100 text-yellow-700' };
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colors[color]}`}>{text}</span>;
}

function BidResultsTable({ items, favIds, setFavIds, getItemId }: TableProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">★</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">공고번호</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[280px]">공고명</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">구분</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">공고기관</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">공고일</th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">추정가격</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">마감</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item, i) => {
              const itemId = getItemId(item);
              const isFav = favIds.has(itemId);
              return (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-3">
                    <FavoriteButton
                      apiType="bid"
                      itemId={itemId}
                      itemData={item}
                      initialFavorited={isFav}
                      onToggle={fav => setFavIds(prev => { const s = new Set(prev); fav ? s.add(itemId) : s.delete(itemId); return s; })}
                    />
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">
                    {item.bidNtceUrl ? (
                      <a href={String(item.bidNtceUrl)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{String(item.bidNtceNo ?? '')}</a>
                    ) : String(item.bidNtceNo ?? '')}
                  </td>
                  <td className="px-3 py-3 font-medium text-gray-900 max-w-xs">
                    {item.bidNtceUrl ? (
                      <a href={String(item.bidNtceUrl)} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 hover:underline line-clamp-2">{String(item.bidNtceNm ?? '')}</a>
                    ) : <span className="line-clamp-2">{String(item.bidNtceNm ?? '')}</span>}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <Badge text={String(item.bsnsDivNm ?? '')} color={item.bsnsDivNm === '공사' ? 'blue' : item.bsnsDivNm === '용역' ? 'green' : 'gray'} />
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-600">{String(item.bidNtceSttusNm ?? '')}</td>
                  <td className="px-3 py-3 text-xs text-gray-600 max-w-[140px] truncate">{String(item.ntceInsttNm ?? '')}</td>
                  <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">{String(item.bidNtceDate ?? '')} {String(item.bidNtceBgn ?? '')}</td>
                  <td className="px-3 py-3 text-right text-xs text-gray-900 font-medium whitespace-nowrap">{formatKRW(item.presmptPrce as string)}</td>
                  <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">{String(item.bidClseDate ?? '')} {String(item.bidClseTm ?? '')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SBResultsTable({ items, favIds, setFavIds, getItemId }: TableProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">★</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">공고번호</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[240px]">공고명</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">구분</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">계약방법</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">공고기관</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">개찰일</th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">낙찰금액</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item, i) => {
              const itemId = getItemId(item);
              const isFav = favIds.has(itemId);
              const url = item.bidNtceNo ? `https://www.g2b.go.kr/link/PNPE027_01/single/?bidPbancNo=${item.bidNtceNo}&bidPbancOrd=${item.bidNtceOrd ?? '000'}` : undefined;
              return (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-3">
                    <FavoriteButton apiType="successful_bid" itemId={itemId} itemData={item} initialFavorited={isFav} onToggle={fav => setFavIds(prev => { const s = new Set(prev); fav ? s.add(itemId) : s.delete(itemId); return s; })} />
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-gray-500">
                    {url ? <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{String(item.bidNtceNo ?? '')}</a> : String(item.bidNtceNo ?? '')}
                  </td>
                  <td className="px-3 py-3 font-medium text-gray-900">
                    {url ? <a href={url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 hover:underline line-clamp-2">{String(item.bidNtceNm ?? '')}</a> : <span className="line-clamp-2">{String(item.bidNtceNm ?? '')}</span>}
                  </td>
                  <td className="px-3 py-3"><Badge text={String(item.bsnsDivNm ?? '')} /></td>
                  <td className="px-3 py-3 text-xs text-gray-600">{String(item.cntrctCnclsMthdNm ?? '')}</td>
                  <td className="px-3 py-3 text-xs text-gray-600 max-w-[140px] truncate">{String(item.ntceInsttNm ?? '')}</td>
                  <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">{String(item.opengDate ?? '')} {String(item.opengTm ?? '')}</td>
                  <td className="px-3 py-3 text-right text-xs font-medium text-gray-900">{formatKRW(item.scsbidAmt as string)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ContractResultsTable({ items, favIds, setFavIds, getItemId }: TableProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">★</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">계약번호</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[240px]">계약명</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">구분</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">계약방법</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">계약기관</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">체결일</th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">계약금액</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item, i) => {
              const itemId = getItemId(item);
              const isFav = favIds.has(itemId);
              return (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-3">
                    <FavoriteButton apiType="contract" itemId={itemId} itemData={item} initialFavorited={isFav} onToggle={fav => setFavIds(prev => { const s = new Set(prev); fav ? s.add(itemId) : s.delete(itemId); return s; })} />
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-gray-500">{String(item.cntrctNo ?? '')}</td>
                  <td className="px-3 py-3 font-medium text-gray-900">
                    <span className="line-clamp-2">{String(item.cntrctNm ?? '')}</span>
                  </td>
                  <td className="px-3 py-3"><Badge text={String(item.bsnsDivNm ?? '')} /></td>
                  <td className="px-3 py-3 text-xs text-gray-600">{String(item.cntrctCnclsMthdNm ?? '')}</td>
                  <td className="px-3 py-3 text-xs text-gray-600 max-w-[140px] truncate">{String(item.cntrctInsttNm ?? item.dmndInsttNm ?? '')}</td>
                  <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">{String(item.cntrctCnclsDate ?? '')}</td>
                  <td className="px-3 py-3 text-right text-xs font-medium text-gray-900">{formatKRW(item.cntrctAmt as string)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
