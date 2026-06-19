import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db, initDb } from '@/lib/db';
import { bidItems } from '@/lib/schema';
import { and, eq } from 'drizzle-orm';

type Item = Record<string, string>;

function fmt(val: string | undefined | null) {
  return val || '-';
}

function fmtKRW(val: string | undefined | null) {
  if (!val) return '-';
  const n = Number(val);
  if (isNaN(n)) return val;
  return new Intl.NumberFormat('ko-KR').format(n) + '원';
}

function fmtDt(val: string | undefined | null) {
  if (!val) return '-';
  return val; // API returns pre-formatted datetime strings like "2026-06-19 14:31:09"
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-blue-700 px-4 py-2">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function InfoTable({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map(([label, value], i) => (
          <tr key={i} className="border-b border-gray-100 last:border-b-0">
            <th className="w-[30%] px-4 py-2.5 text-left text-xs font-medium text-gray-600 bg-gray-50 whitespace-nowrap align-top">
              {label}
            </th>
            <td className="px-4 py-2.5 text-gray-900 text-sm">{value ?? '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function parseAttachments(item: Item) {
  const files: { url: string; name: string }[] = [];
  for (let i = 1; i <= 10; i++) {
    const url = item[`ntceSpecDocUrl${i}`];
    const name = item[`ntceSpecFileNm${i}`];
    if (url && name) files.push({ url, name });
  }
  return files;
}

function parsePurchaseItems(raw: string | undefined) {
  if (!raw) return [];
  // format: "[seq^clsfcNo^clsfcNm]"
  return raw
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map(s => {
      const parts = s.trim().split('^');
      return { seq: parts[0], clsfcNo: parts[1], clsfcNm: parts[2] };
    })
    .filter(p => p.clsfcNm);
}

export default async function BidServcShowPage({ params }: { params: Promise<{ id: string }> }) {
  await initDb();
  const { id } = await params;
  const dashIdx = id.lastIndexOf('-');
  const no = dashIdx > 0 ? id.slice(0, dashIdx) : id;
  const ord = dashIdx > 0 ? id.slice(dashIdx + 1) : '000';

  const rows = await db
    .select()
    .from(bidItems)
    .where(and(eq(bidItems.bizType, 'servc'), eq(bidItems.bidNtceNo, no), eq(bidItems.bidNtceOrd, ord)))
    .limit(1);

  if (rows.length === 0) notFound();

  const item: Item = JSON.parse(rows[0].rawData);

  const g2bUrl = item.bidNtceDtlUrl || `https://www.g2b.go.kr/link/PNPE027_01/single/?bidPbancNo=${no}&bidPbancOrd=${ord}`;
  const attachments = parseAttachments(item);
  const purchaseItems = parsePurchaseItems(item.purchsObjPrdctList);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-5">
        <Link href="/search" className="text-sm text-blue-600 hover:underline">← 검색으로 돌아가기</Link>
        <div className="mt-3 flex items-start justify-between gap-4">
          <div>
            <span className="inline-block bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded mb-2">
              🛠️ 용역 · {fmt(item.srvceDivNm)}
            </span>
            <h1 className="text-xl font-bold text-gray-900 leading-snug">{fmt(item.bidNtceNm)}</h1>
            <p className="mt-1 text-sm text-gray-500 font-mono">{no}-{ord}</p>
          </div>
          <a
            href={g2bUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            나라장터에서 보기 ↗
          </a>
        </div>
      </div>

      {/* 공고일반 */}
      <Section title="공고일반">
        <InfoTable rows={[
          ['공고종류', fmt(item.ntceKindNm)],
          ['게시일시', fmtDt(item.bidNtceDt)],
          ['입찰공고번호', `${no}-${ord}`],
          ['참조번호', fmt(item.refNo)],
          ['공고명', fmt(item.bidNtceNm)],
          ['입찰방식', fmt(item.bidMethdNm)],
          ['낙찰방법', fmt(item.sucsfbidMthdNm)],
          ['계약방법', fmt(item.cntrctCnclsMthdNm)],
          ['국제입찰여부', item.intrbidYn === 'Y' ? '국제입찰' : '국내입찰'],
          ['채권자명', fmt(item.crdtrNm)],
          ['공동수급협정서 제출방식', fmt(item.cmmnSpldmdMethdNm)],
          ['재입찰여부', item.reNtceYn === 'Y' ? '재입찰' : '일반'],
          ['예가방법', fmt(item.prearngPrceDcsnMthdNm)],
          ['사전규격등록번호', fmt(item.bfSpecRgstNo)],
          ['발주계획번호', fmt(item.orderPlanUntyNo)],
          ['통합공고번호', fmt(item.untyNtceNo)],
          ['정보화사업여부', item.infoBizYn === 'Y' ? '해당' : '미해당'],
          ['지역제한여부', item.cmmnSpldmdCorpRgnLmtYn === 'Y' ? '지역제한' : '제한없음'],
        ]} />
      </Section>

      {/* 입찰자격 */}
      <Section title="입찰자격">
        <InfoTable rows={[
          ['업종제한여부', item.indstrytyLmtYn === 'Y' ? '해당' : '미해당'],
          ['제품분류제한여부', item.prdctClsfcLmtYn === 'Y' ? '해당' : '미해당'],
          ['지정경쟁여부', item.dsgntCmptYn === 'Y' ? '해당' : '미해당'],
          ['대안입찰허용여부', item.arsltCmptYn === 'Y' ? '해당' : '미해당'],
          ['사전심사(PQ)여부', item.pqEvalYn === 'Y' ? '해당' : '미해당'],
          ['기술제안입찰여부', item.tpEvalYn === 'Y' ? '해당' : '미해당'],
          ['입찰참가제한여부', item.bidPrtcptLmtYn === 'Y' ? '해당' : '미해당'],
          ['간략입찰허용여부', item.brffcBidprcPermsnYn === 'Y' ? '해당' : '미해당'],
          ['세부내역입찰여부', item.dtlsBidYn === 'Y' ? '해당' : '미해당'],
        ]} />
      </Section>

      {/* 입찰진행정보 */}
      <Section title="입찰진행정보">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-600">진행명</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-600">시작일시</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-600">종료일시</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                ['공고게시', item.bidNtceDt, ''],
                ['입찰참가자격등록', '', item.bidQlfctRgstDt],
                ['공동수급협정서제출', '', item.cmmnSpldmdAgrmntClseDt],
                ['입찰서제출', item.bidBeginDt, item.bidClseDt],
                ['개찰', item.opengDt, ''],
                ['재개찰', item.rbidOpengDt !== item.opengDt ? item.rbidOpengDt : '', ''],
              ].filter(([, start, end]) => start || end).map(([name, start, end], i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-900">{name}</td>
                  <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{fmtDt(start as string)}</td>
                  <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{end ? fmtDt(end as string) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* 협상에 의한 계약 */}
      {(item.techAbltEvlRt || item.bidPrceEvlRt) && (
        <Section title="협상에 의한 계약">
          <InfoTable rows={[
            ['기술능력평가비율', item.techAbltEvlRt ? item.techAbltEvlRt + '%' : '-'],
            ['입찰가격평가비율', item.bidPrceEvlRt ? item.bidPrceEvlRt + '%' : '-'],
          ]} />
        </Section>
      )}

      {/* 가격 */}
      <Section title="가격">
        <InfoTable rows={[
          ['예가방법', fmt(item.prearngPrceDcsnMthdNm)],
          ['추정가격', fmtKRW(item.presmptPrce)],
          ['부가가치세', fmtKRW(item.VAT)],
          ['배정예산', fmtKRW(item.asignBdgtAmt)],
          ['입찰참가수수료', fmtKRW(item.bidPrtcptFee)],
        ]} />
      </Section>

      {/* 기관담당자정보 */}
      <Section title="기관담당자정보">
        <InfoTable rows={[
          ['공고기관', `${fmt(item.ntceInsttNm)} (${fmt(item.ntceInsttCd)})`],
          ['담당자명', fmt(item.ntceInsttOfclNm)],
          ['담당자 전화번호', fmt(item.ntceInsttOfclTelNo)],
          ['담당자 이메일', fmt(item.ntceInsttOfclEmailAdrs)],
          ['집행관', fmt(item.exctvNm)],
          ['수요기관', `${fmt(item.dminsttNm)} (${fmt(item.dminsttCd)})`],
          ['수요기관 이메일', fmt(item.dminsttOfclEmailAdrs)],
        ]} />
      </Section>

      {/* 구매대상물품 */}
      {purchaseItems.length > 0 && (
        <Section title="구매대상물품">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-600">순번</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-600">분류번호</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-600">품명</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {purchaseItems.map((p, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-600">{p.seq}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{p.clsfcNo}</td>
                    <td className="px-4 py-2.5 text-gray-900">{p.clsfcNm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500 bg-gray-50">
            공공조달 분류: {fmt(item.pubPrcrmntLrgClsfcNm)} &gt; {fmt(item.pubPrcrmntMidClsfcNm)} &gt; {fmt(item.pubPrcrmntClsfcNm)}
          </div>
        </Section>
      )}

      {/* 파일첨부 */}
      {attachments.length > 0 && (
        <Section title="파일첨부">
          <div className="divide-y divide-gray-100">
            {attachments.map((f, i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-3">
                <span className="text-gray-400 text-xs font-mono w-5">{i + 1}</span>
                <a
                  href={f.url}
                  className="text-blue-600 hover:underline text-sm truncate"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {f.name}
                </a>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Raw Data */}
      <details className="mt-4 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <summary className="px-4 py-3 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-50 bg-gray-50 border-b border-gray-200">
          원본 데이터 (JSON)
        </summary>
        <pre className="p-4 text-xs text-gray-700 overflow-auto max-h-96 font-mono">
          {JSON.stringify(item, null, 2)}
        </pre>
      </details>
    </div>
  );
}
