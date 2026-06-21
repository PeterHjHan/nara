const BASE_URL = 'https://apis.data.go.kr/1230000/ad/BidPublicInfoService';

// inqryDiv: 1=등록일시, 2=입찰공고번호, 3=변경일시
export type InqryDiv = '1' | '2' | '3';
export type BizType = 'cnstwk' | 'servc' | 'frgcpt' | 'thng'; // 공사, 용역, 외자, 물품

export interface BidSearchParams {
  bizType: BizType;
  inqryDiv: InqryDiv;
  inqryBgnDt?: string; // YYYYMMDDHHMM — required when inqryDiv is '1' or '3'
  inqryEndDt?: string; // YYYYMMDDHHMM — required when inqryDiv is '1' or '3'
  bidNtceNo?: string;  // required when inqryDiv is '2'
  numOfRows?: number;
  pageNo?: number;
}

export interface ApiResponse<T> {
  items: T[];
  totalCount: number;
  pageNo: number;
  numOfRows: number;
}

const ENDPOINT_MAP: Record<BizType, string> = {
  cnstwk: 'getBidPblancListInfoCnstwk',
  servc:  'getBidPblancListInfoServc',
  frgcpt: 'getBidPblancListInfoFrgcpt',
  thng:   'getBidPblancListInfoThng',
};

export const BIZ_TYPE_LABEL: Record<BizType, string> = {
  cnstwk: '공사',
  servc:  '용역',
  frgcpt: '외자',
  thng:   '물품',
};

export const INQRY_DIV_LABEL: Record<InqryDiv, string> = {
  '1': '등록일시',
  '2': '입찰공고번호',
  '3': '변경일시',
};

// Fetches all pages until a page returns fewer items than the page size.
export async function fetchAllBidNotices(params: BidSearchParams): Promise<ApiResponse<Record<string, string>>> {
  const PAGE_SIZE = 100;
  let pageNo = 1;
  let allItems: Record<string, string>[] = [];
  let totalCount = 0;

  while (true) {
    const result = await fetchBidNotices({ ...params, numOfRows: PAGE_SIZE, pageNo });
    totalCount = result.totalCount;
    allItems = allItems.concat(result.items);
    if (result.items.length < PAGE_SIZE) break;
    pageNo++;
  }

  return { items: allItems, totalCount, pageNo, numOfRows: PAGE_SIZE };
}

export async function fetchBidNotices(params: BidSearchParams): Promise<ApiResponse<Record<string, string>>> {
  const serviceKey = process.env.NARA_SERVICE_KEY;
  if (!serviceKey) throw new Error('NARA_SERVICE_KEY is not set');

  const endpoint = ENDPOINT_MAP[params.bizType];
  const query = new URLSearchParams({
    ServiceKey: serviceKey,
    type: 'json',
    numOfRows: String(params.numOfRows ?? 100),
    pageNo: String(params.pageNo ?? 1),
    inqryDiv: params.inqryDiv,
  });

  if (params.inqryBgnDt) query.set('inqryBgnDt', params.inqryBgnDt);
  if (params.inqryEndDt) query.set('inqryEndDt', params.inqryEndDt);
  if (params.bidNtceNo)  query.set('bidNtceNo',  params.bidNtceNo);

  const url = `${BASE_URL}/${endpoint}?${query}`;
  const res = await fetch(url, { cache: 'no-store' });

  const text = await res.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`API returned non-JSON response: ${text.slice(0, 200)}`);
  }

  const header = (data.response as Record<string, unknown>)?.header as Record<string, string> | undefined;
  if (header?.resultCode !== '00') {
    throw new Error(`API error: ${header?.resultMsg ?? 'Unknown'}`);
  }

  const body = (data.response as Record<string, unknown>)?.body as Record<string, unknown> | undefined;
  const raw = (body?.items as Record<string, unknown>)?.item ?? [];
  const items = Array.isArray(raw) ? raw : [raw];

  return {
    items: items as Record<string, string>[],
    totalCount: Number(body?.totalCount ?? 0),
    pageNo: Number(body?.pageNo ?? 1),
    numOfRows: Number(body?.numOfRows ?? 100),
  };
}
