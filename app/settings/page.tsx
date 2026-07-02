'use client';
import { useEffect, useState } from 'react';

interface Settings {
  nara_service_key?: string;
  telegram_bot_token?: string;
  telegram_chat_id?: string;
  cron_hour?: string;
  cron_minute?: string;
  keyword_dminstt?: string; // 수요기관 keywords, one per line
  keyword_bidntce?: string; // 공고명 keywords, one per line
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testMsg, setTestMsg] = useState('');
  const [testing, setTesting] = useState<false | 'morning' | 'afternoon'>(false);

  const DEFAULTS: Partial<Settings> = {
    keyword_dminstt: '외교부\n한국국제협력단\n해외건설협회\n한국해외인프라도시개발지원공사\nKOICA',
    keyword_bidntce: 'ODA\nPMC\nPMO\n종료평가\n성과평가\n타당성조사\nF/S\n기획조사\n심층조사\n예비타당성',
  };

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then((data: Settings) => setSettings({ ...DEFAULTS, ...data }))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const runCron = async (force: 'morning' | 'afternoon') => {
    setTesting(force);
    setTestMsg('');
    try {
      const res = await fetch(`/api/cron?force=${force}`);
      const data = await res.json();
      if (data.error) {
        setTestMsg(`❌ ${data.error}`);
      } else {
        const byType = Object.entries(data.byType as Record<string, number>)
          .map(([k, v]) => `${k}: ${v}건`).join(', ');
        setTestMsg(`✅ ${data.run} 전송 완료 | 범위: ${data.range} | ${byType}`);
      }
    } catch {
      setTestMsg('❌ 연결 실패');
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <div className="text-center py-16 text-gray-400">불러오는 중...</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-gray-900 mb-6">설정</h1>

      <div className="space-y-6">
        {/* API Key */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-1">나라장터 API 키</h2>
          <p className="text-xs text-gray-500 mb-4">
            <a href="https://www.data.go.kr" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">data.go.kr</a>에서 발급받은 서비스 키를 입력하세요.
          </p>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">서비스 키 (ServiceKey)</label>
            <input
              type="password"
              value={settings.nara_service_key ?? ''}
              onChange={e => setSettings(s => ({ ...s, nara_service_key: e.target.value }))}
              placeholder="공공데이터포털에서 발급받은 인증키"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
            <p className="font-medium mb-1">API 키 발급 방법:</p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>data.go.kr 회원가입/로그인</li>
              <li>&quot;나라장터 공공데이터개방표준서비스&quot; 검색</li>
              <li>활용신청 → 서비스키 발급 (즉시 또는 1-2일)</li>
            </ol>
          </div>
        </section>

        {/* Telegram */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-1">텔레그램 알림</h2>
          <p className="text-xs text-gray-500 mb-4">매일 아침 검색 결과 요약을 텔레그램으로 받습니다.</p>

          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Bot Token</label>
            <input
              type="password"
              value={settings.telegram_bot_token ?? ''}
              onChange={e => setSettings(s => ({ ...s, telegram_bot_token: e.target.value }))}
              placeholder="1234567890:ABCdefGHIjklMNOpqrSTUvwxyz"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Chat ID</label>
            <input
              type="text"
              value={settings.telegram_chat_id ?? ''}
              onChange={e => setSettings(s => ({ ...s, telegram_chat_id: e.target.value }))}
              placeholder="-1001234567890 (채널) 또는 123456789 (개인)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 mb-4">
            <p className="font-medium text-gray-700 mb-2">텔레그램 봇 설정 방법:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>텔레그램에서 <strong>@BotFather</strong>에게 메시지 보내기</li>
              <li><code className="bg-gray-200 px-1 rounded">/newbot</code> 명령어 입력 후 봇 이름 설정</li>
              <li>발급받은 <strong>Bot Token</strong>을 위에 입력</li>
              <li>봇과 대화를 시작하거나 채널에 봇 추가</li>
              <li><strong>@userinfobot</strong>에게 메시지를 보내 본인의 Chat ID 확인</li>
              <li>채널의 경우: 채널에 봇을 관리자로 추가 후, <code className="bg-gray-200 px-1 rounded">https://api.telegram.org/bot{`{TOKEN}`}/getUpdates</code> 에서 chat.id 확인</li>
            </ol>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => runCron('morning')}
              disabled={!!testing || !settings.telegram_bot_token || !settings.telegram_chat_id}
              className="text-sm px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
            >
              {testing === 'morning' ? '전송 중...' : '🌅 오전 조회 테스트'}
            </button>
            <button
              onClick={() => runCron('afternoon')}
              disabled={!!testing || !settings.telegram_bot_token || !settings.telegram_chat_id}
              className="text-sm px-4 py-2 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-100 disabled:opacity-50 transition-colors"
            >
              {testing === 'afternoon' ? '전송 중...' : '🌇 오후 조회 테스트'}
            </button>
          </div>
          {testMsg && (
            <p className="mt-3 text-xs bg-gray-50 rounded-lg p-3 text-gray-700 font-mono break-all">{testMsg}</p>
          )}
        </section>

        {/* Cron Schedule */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-1">알림 시간 (KST)</h2>
          <p className="text-xs text-gray-500 mb-4">매일 텔레그램 요약을 받을 시간을 설정합니다. (Vercel Cron은 UTC 기준으로 작동합니다.)</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">시 (Hour KST)</label>
              <select
                value={settings.cron_hour ?? '8'}
                onChange={e => setSettings(s => ({ ...s, cron_hour: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={String(i)}>{i}시</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">분 (Minute)</label>
              <select
                value={settings.cron_minute ?? '0'}
                onChange={e => setSettings(s => ({ ...s, cron_minute: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[0, 15, 30, 45].map(m => (
                  <option key={m} value={String(m)}>{m}분</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3 bg-yellow-50 rounded-lg p-3 text-xs text-yellow-700">
            ⚠️ Vercel Cron은 UTC 기준입니다. KST {settings.cron_hour ?? '8'}:{(settings.cron_minute ?? '0').padStart(2, '0')} = UTC {(Number(settings.cron_hour ?? 8) - 9 + 24) % 24}:{(settings.cron_minute ?? '0').padStart(2, '0')} 에 실행됩니다.
            vercel.json의 cron 시간을 직접 수정하거나 <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline">Vercel 대시보드</a>에서 설정하세요.
          </div>
        </section>

        {/* Monitoring Keywords */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-1">모니터링 키워드</h2>
          <p className="text-xs text-gray-500 mb-4">
            크론 알림에 포함할 공고를 필터링합니다. 둘 중 하나라도 일치하면 포함됩니다. 키워드는 한 줄에 하나씩 입력하세요.
          </p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">수요기관 키워드</label>
            <p className="text-xs text-gray-400 mb-2">dminsttNm(수요기관명) 또는 ntceInsttNm(공고기관명)에 포함된 경우 매칭</p>
            <textarea
              rows={6}
              value={settings.keyword_dminstt ?? ''}
              onChange={e => setSettings(s => ({ ...s, keyword_dminstt: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              placeholder="외교부&#10;한국국제협력단&#10;KOICA"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">공고명 키워드</label>
            <p className="text-xs text-gray-400 mb-2">bidNtceNm(공고명)에 포함된 경우 매칭</p>
            <textarea
              rows={8}
              value={settings.keyword_bidntce ?? ''}
              onChange={e => setSettings(s => ({ ...s, keyword_bidntce: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              placeholder="ODA&#10;PMC&#10;PMO&#10;종료평가"
            />
          </div>

          <div className="mt-3 bg-gray-50 rounded-lg p-3 text-xs text-gray-500">
            키워드가 비어있으면 전체 공고를 포함합니다.
          </div>
        </section>

        <button
          onClick={save}
          disabled={saving}
          className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? '저장 중...' : saved ? '✅ 저장됨' : '설정 저장'}
        </button>
      </div>
    </div>
  );
}
