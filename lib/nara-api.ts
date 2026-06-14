const BASE_URL = 'http://apis.data.go.kr/1230000/ao/PubDataOpnStdService';

export interface BidSearchParams {
  bidNtceBgnDt: string; // YYYYMMDDHHMM
  bidNtceEndDt: string; // YYYYMMDDHHMM
  numOfRows?: number;
  pageNo?: number;
}

export interface SuccessfulBidSearchParams {
  bsnsDivCd: string; // 1=물품, 2=외자, 3=공사, 5=용역
  opengBgnDt: string; // YYYYMMDDHHMM
  opengEndDt: string; // YYYYMMDDHHMM
  numOfRows?: number;
  pageNo?: number;
}

export interface ContractSearchParams {
  cntrctCnclsBgnDate: string; // YYYYMMDD
  cntrctCnclsEndDate: string; // YYYYMMDD
  insttDivCd?: string; // 1=계약기관, 2=수요기관
  insttCd?: string;
  numOfRows?: number;
  pageNo?: number;
}

export interface ApiResponse<T> {
  items: T[];
  totalCount: number;
  pageNo: number;
  numOfRows: number;
}

async function fetchNara<T>(endpoint: string, params: Record<string, string | number | undefined>): Promise<ApiResponse<T>> {
  const serviceKey = process.env.NARA_SERVICE_KEY;
  if (!serviceKey) throw new Error('NARA_SERVICE_KEY is not set');

  const query = new URLSearchParams({ ServiceKey: serviceKey, type: 'json', numOfRows: '100', pageNo: '1' });
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') query.set(k, String(v));
  }

  const url = `${BASE_URL}/${endpoint}?${query}`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`API error: ${res.status}`);

  const data = await res.json();

  // Handle both JSON and error responses
  if (data.response) {
    const body = data.response.body;
    const items = body?.items?.item ?? [];
    return {
      items: Array.isArray(items) ? items : [items],
      totalCount: body?.totalCount ?? 0,
      pageNo: body?.pageNo ?? 1,
      numOfRows: body?.numOfRows ?? 100,
    };
  }

  throw new Error(data?.response?.header?.resultMsg ?? 'Unknown API error');
}

export async function fetchBidNotices(params: BidSearchParams, page = 1) {
  return fetchNara('getDataSetOpnStdBidPblancInfo', { ...params, pageNo: page });
}

export async function fetchSuccessfulBids(params: SuccessfulBidSearchParams, page = 1) {
  return fetchNara('getDataSetOpnStdScsbidInfo', { ...params, pageNo: page });
}

export async function fetchContracts(params: ContractSearchParams, page = 1) {
  return fetchNara('getDataSetOpnStdCntrctInfo', { ...params, pageNo: page });
}
