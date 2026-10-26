// Privacy notice copy for /privacy — from docs/PRIVACY_NOTICE_DRAFT.md (operating policy confirmed 2026-10-19;
// effective date, contact person, Supabase / Vercel regions and plans confirmed by the operator the same day).
// Sections follow 개인정보 보호법 제30조 제1항 · 시행령 제31조 제1항; overseas transfer lists the 제28조의8 제2항 items.
// Vendor facts: Vercel runtime logs 1 h on Hobby, Supabase logs 1 day on Free (vendor docs, 2026-10-19); /running and
// /items/[id] are served by Vercel Functions in iad1 (x-vercel-id); the site sets no cookies.
// Remaining items approved by the in-house privacy officer on 2026-10-22 (approval sheet items 1–5, item 2 = 안 A).
// Facts here must match the code and DB: supabase/migrations/*.sql, src/lib/events/track.ts, src/lib/analytics/*.

import { NOTICE_VERSION, POSTHOG_MODE } from "@/lib/analytics/posthog";

export const PRIVACY_EMAIL = "chorock@chorock.co.kr";
export const PRIVACY_PHONE = "02-534-2007";

/** PostHog receives regular users' events only in consent / all mode (qa = internal QA browsers only). */
const POSTHOG_USERS = POSTHOG_MODE === "consent" || POSTHOG_MODE === "all";
const POSTHOG_REFUSE =
  POSTHOG_MODE === "consent"
    ? "아래 ‘이용 통계 분석’에서 두 항목(이용 통계 분석·국외 이전)에 모두 동의한 경우에만 보냅니다"
    : "아래 ‘이용 통계 분석’에서 ‘보내지 않기’를 고르면 보내지 않습니다";
/** "2026-10-27" → "2026년 10월 27일" */
const koreanDate = (v: string) => {
  const [y, m, d] = v.split("-").map(Number);
  return `${y}년 ${m}월 ${d}일`;
};
/** all = opt-out: no separate consent; the wording below changes only in that mode (consent-mode text stays as approved). */
const OPT_OUT = POSTHOG_MODE === "all";
const POSTHOG_SENT = OPT_OUT // = POSTHOG_EVENTS in lib/analytics/posthog-policy.ts
  ? "익명 ID, 주요 이용 기록(방문, 테스트 진행·결과 유형, 온보딩 완료, RUNNING·통계 화면 보기, 러닝 기록 저장, ITEMS·신발 상세 보기·저장, 카드 이미지 만들기·저장), 화면 경로, 브라우저·기기 종류"
  : "익명 ID, 이용 기록(허용된 항목만), 화면 경로, 브라우저·기기 종류";


function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 border-t border-gm-line pt-6">
      <h2 className="m-0 text-[18px] leading-7 font-extrabold break-keep">
        {n}. {title}
      </h2>
      <div className="mt-3 text-[15px] leading-6 text-gm-g1 break-keep">{children}</div>
    </section>
  );
}

function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="m-0 list-none p-0">
      {items.map((it, i) => (
        <li key={i} className="relative mt-2 pl-4 first:mt-0">
          <span aria-hidden="true" className="absolute top-0 left-0">
            ·
          </span>
          {it}
        </li>
      ))}
    </ul>
  );
}

const STORED: { label: string; items: string; need: string }[] = [
  { label: "이용자 구분", items: "무작위로 만들어지는 익명 ID", need: "자동 · 처음 방문할 때" },
  { label: "러닝 테스트", items: "5문항 답변, 러닝 동물 결과", need: "필수 · 테스트를 마칠 때" },
  { label: "러닝 습관", items: "러닝 경험, 주간 러닝 횟수, 한 번에 뛰는 거리, 주간 총 거리", need: "필수 3개 · 선택 1개" },
  { label: "신체 정보", items: "키, 체중, 발 사이즈, 관심 거리", need: "선택 · 건너뛸 수 있음" },
  { label: "신발", items: "지금 신는 러닝화 이름, 관심 신발로 저장한 제품", need: "선택" },
  { label: "러닝 기록", items: "날짜, 거리, 시간, 그때 신은 신발", need: "기록을 저장할 때만" },
  { label: "이용 기록", items: "화면 방문·버튼 사용 같은 이용 이벤트, 화면 주소, 발생 시각 (답변 내용·키·체중은 넣지 않음)", need: "자동 · 서비스를 쓰는 동안" },
  { label: "접속 정보", items: "IP 주소, 브라우저 종류 등 접속 기록", need: "자동 · 로그인 상태 유지와 웹사이트 제공 과정에서" },
];

export function PrivacyNotice() {
  return (
    <div>
      <p className="mt-4 mb-0 text-[15px] leading-6 text-gm-g1 break-keep">
        초록소프트(ChoRockSoft)가 운영하는 GearMatch는 로그인 없이 쓰는 러닝 서비스입니다. 이름·이메일·전화번호·위치(GPS)는 받지 않습니다. 이 안내는
        서비스가 저장하는 정보와 그 이유, 삭제 방법을 설명합니다.
      </p>
      <p className="mt-3 mb-0 text-[15px] leading-6 text-gm-g1 break-keep">
        이 안내는 2026년 10월 19일 시작한 내부 테스트와 2026년 10월 21일 시작 예정인 외부 테스트에 적용됩니다.
      </p>

      <Section n={1} title="저장하는 정보">
        <dl className="m-0">
          {STORED.map((r) => (
            <div key={r.label} className="border-b border-gm-line py-3 first:pt-0 last:border-b-0">
              <dt className="text-[15px] font-bold text-gm-tx">{r.label}</dt>
              <dd className="m-0 mt-1">{r.items}</dd>
              <dd className="m-0 mt-0.5 text-[14px] text-gm-g2">{r.need}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-3">
          <Bullets
            items={[
              "카드 이미지(이미지 저장)는 이용자의 기기에서 만들어지며 서버로 보내지 않습니다.",
              ...(POSTHOG_USERS
                ? [
                    `이용 통계 분석 ${OPT_OUT ? "선택(보내지 않기·다시 보내기)" : "동의·철회"} 기록(선택 내용, 안내 버전, 시각, 선택한 화면)을 저장합니다. 이 기록은 고칠 수 없고, 내 데이터를 삭제하면 함께 삭제됩니다.`,
                  ]
                : []),
              "브라우저 저장 공간에는 익명 로그인 상태와 서비스 설정이 저장됩니다.",
            ]}
          />
        </div>
      </Section>

      <Section n={2} title="처리 목적">
        <Bullets
          items={[
            "러닝 동물 결과와 내 러닝 기록·통계 보여 주기",
            "비슷한 신체 조건의 러닝화 정보 보여 주기(ITEMS) — 키·체중·발 사이즈를 입력한 경우에만",
            "서비스 개선을 위한 이용 통계(단계별 완료율 등) — 개인을 식별하지 않는 집계로 사용",
            "서비스 제공과 보안을 위한 접속 처리(접속 정보)",
          ]}
        />
        <p className="mt-3 mb-0 font-bold text-gm-tx">항목별 처리 근거</p>
        <div className="mt-2">
          <Bullets
            items={[
              "익명 ID, 러닝 테스트 답변·결과, 러닝 습관, 신발, 러닝 기록: 서비스 제공(이용 계약 이행)에 필요한 범위에서 처리합니다.",
              "이용 기록·접속 정보: 서비스 제공과 보안, 서비스 개선을 위한 통계 집계에 처리합니다.",
              "신체 정보(키·체중·발 사이즈): 선택 항목입니다. 입력한 경우에만 비슷한 조건의 러닝화 정보를 보여 주는 데 쓰며, 입력하지 않아도 서비스를 이용할 수 있습니다.",
              OPT_OUT
                ? "PostHog 이용 통계 분석: 위 이용 기록과 같은 목적(서비스 개선 통계)으로 PostHog에 처리를 맡깁니다(7번 처리 위탁). ‘이용 통계 분석’에서 ‘보내지 않기’를 고르면 보내지 않습니다."
                : "PostHog 이용 통계 분석: 이용자가 별도로 동의한 경우에만 처리합니다.",
            ]}
          />
        </div>
      </Section>

      <Section n={3} title="보유 기간">
        <Bullets
          items={[
            <>
              내부 테스트와 외부 테스트에서 저장된 정보는 <strong className="text-gm-tx">2027년 2월 4일</strong>까지 보관한 뒤 삭제합니다(외부 테스트 종료
              예정일 2026년 11월 4일로부터 3개월).
            </>,
            "보유 기간 중에도 이용자가 삭제하거나 삭제를 요청하면 5번에 따라 삭제합니다.",
            "법령에 따라 별도로 보존해야 하는 정보는 없습니다. 모든 정보는 2027년 2월 4일까지 보관한 뒤 삭제합니다.",
            "서비스 제공 회사의 접속 기록 보관 기간(현재 요금제 기준): Vercel 요청 기록 1시간, Supabase 로그 1일. 각 회사가 보안 등을 위해 따로 보관하는 기록은 각 회사의 정책을 따릅니다.",
            "데이터베이스 자동 백업 기능은 사용하지 않습니다.",
          ]}
        />
      </Section>

      <Section n={4} title="파기 절차와 방법">
        보유 기간이 끝나거나 삭제를 요청받으면 데이터베이스에서 해당 정보를 삭제합니다. 삭제된 정보는 서비스에서 다시 불러올 수 없습니다.
      </Section>

      <Section n={5} title="삭제 방법">
        <Bullets
          items={[
            <>
              <strong className="text-gm-tx">앱 안에서 바로 삭제:</strong> 이 화면 맨 아래의 ‘내 데이터 삭제하기’를 누르면 지금 이 브라우저(앱)에서 쓰는 익명 계정과 그
              계정의 테스트 결과·러닝 습관·신체 정보·신발·러닝 기록·이용 기록이 모두 삭제되며 되돌릴 수 없습니다. 데이터를 만든 같은 브라우저(앱)에서 열어야 합니다.
            </>,
            <>
              <strong className="text-gm-tx">이메일 요청:</strong> 데이터를 만든 브라우저(앱)를 더 이상 쓸 수 없다면 이메일({PRIVACY_EMAIL})로 삭제를 요청할 수
              있습니다. 운영자는 보내 주신 정보로 해당 익명 계정을 식별할 수 있는지 확인한 뒤 삭제합니다. 로그인 없이 쓰는 서비스라 계정을 식별할 수 없으면
              개별 삭제를 처리할 수 없으며, 이 경우 그 사유를 회신합니다. 이때에도 정보는 2027년 2월 4일 보관 기간이 끝나면 함께 삭제됩니다.
            </>,
            "브라우저 데이터만 지우면 이 기기에서 기록을 불러올 수 없게 될 뿐, 서버의 기록은 삭제되지 않습니다.",
            ...(POSTHOG_USERS
              ? [
                  <>
                    PostHog로 보낸 이용 기록은 GearMatch 서버 기록과 삭제 시점이 다릅니다. ‘내 데이터 삭제하기’를 누르거나 {OPT_OUT ? "‘보내지 않기’를 고르면" : "동의를 철회하면"} 삭제 요청을
                    함께 보내고, 운영자가 수시로 PostHog에서 삭제합니다. 광고 차단 등으로 요청이 전달되지 않은 경우를 찾기 위해 주 1회 점검합니다.
                  </>,
                ]
              : []),
          ]}
        />
      </Section>

      <Section n={6} title="제3자 제공">
        저장한 정보를 제3자에게 제공하지 않습니다.
      </Section>

      <Section n={7} title="처리 위탁">
        <dl className="m-0">
          <div className="border-b border-gm-line py-3 first:pt-0">
            <dt className="text-[15px] font-bold text-gm-tx">Supabase Inc.</dt>
            <dd className="m-0 mt-1">데이터베이스·익명 로그인 — 1번의 정보 전체(접속 정보 포함). 데이터베이스 위치: 대한민국 서울(ap-northeast-2)</dd>
          </div>
          <div className="border-b border-gm-line py-3">
            <dt className="text-[15px] font-bold text-gm-tx">Vercel Inc.</dt>
            <dd className="m-0 mt-1">웹사이트 제공(호스팅) — 접속 정보(IP·브라우저·요청 주소). 앱 데이터는 Vercel을 거치지 않고 Supabase로 바로 전송됩니다.</dd>
          </div>
          <div className="py-3 last:pb-0">
            <dt className="text-[15px] font-bold text-gm-tx">PostHog Inc.</dt>
            <dd className="m-0 mt-1">
              {POSTHOG_USERS
                ? `이용 통계 분석 — ${POSTHOG_SENT}. ${POSTHOG_REFUSE}.`
                : "이용 통계 분석 — 현재 이용자의 정보는 보내지 않습니다(내부 점검용으로만 사용)."}
            </dd>
          </div>
        </dl>
      </Section>

      <Section n={8} title="국외 이전">
        <dl className="m-0">
          <div className="border-b border-gm-line py-3 first:pt-0">
            <dt className="text-[15px] font-bold text-gm-tx">Vercel Inc. (미국 · privacy@vercel.com)</dt>
            <dd className="m-0 mt-1">항목: 접속 정보(IP 주소, 브라우저 정보, 요청한 화면 주소)</dd>
            <dd className="m-0 mt-1">국가·시기·방법: 미국(iad1, 워싱턴 D.C.) — RUNNING·신발 상세 화면을 열 때 네트워크로 전송</dd>
            <dd className="m-0 mt-1">목적·보유 기간: 웹사이트 제공 · 요청 기록 1시간(현재 요금제 기준)</dd>
          </div>
          {POSTHOG_USERS && (
            <div className="border-b border-gm-line py-3">
              <dt className="text-[15px] font-bold text-gm-tx">PostHog Inc. (미국 · privacy@posthog.com)</dt>
              <dd className="m-0 mt-1">
                {OPT_OUT
                  ? `항목: ${POSTHOG_SENT} — 테스트 답변·신체 정보·직접 입력한 글은 보내지 않음, `
                  : "항목: 익명 ID, 이용 기록(허용된 항목만 — 테스트 답변·키·체중 제외), 화면 경로, 브라우저·기기 종류, "}
                접속 IP(전송 과정에서 받지만 PostHog에 저장하지 않도록 설정, 위치 정보 추출도 하지 않음)
              </dd>
              <dd className="m-0 mt-1">국가·시기·방법: 미국(PostHog US Cloud) — 서비스를 이용하는 동안 네트워크로 전송</dd>
              <dd className="m-0 mt-1">
                목적·보유 기간: 이용 통계 · {OPT_OUT ? "‘보내지 않기’를 고르거나" : "동의를 철회하거나"} 데이터를 삭제하면 운영자가 삭제하며, 늦어도 2027년
                2월 4일에 모두 삭제합니다
              </dd>
              <dd className="m-0 mt-1">
                거부 방법·효과: {POSTHOG_REFUSE}. {OPT_OUT ? "‘보내지 않기’를 골라도" : "동의하지 않거나 철회해도"} 서비스 이용에는 영향이 없습니다.
              </dd>
              <dd className="m-0 mt-1 text-[14px] text-gm-g2">안내 버전 {NOTICE_VERSION}</dd>
            </div>
          )}
          <div className="py-3 last:pb-0">
            <dt className="text-[15px] font-bold text-gm-tx">Supabase Inc. (미국 · privacy@supabase.com)</dt>
            <dd className="m-0 mt-1">항목: 1번의 정보</dd>
            <dd className="m-0 mt-1">
              국가·시기·방법: 데이터베이스는 대한민국 서울(ap-northeast-2), 지원 업무와 하위 처리자는 미국 — 서비스 이용 중 네트워크 전송, 운영 지원 시 조회
              (Supabase 공식 하위 처리자 목록 2026년 10월 12일 기준: 지원 Supabase Inc., 호스팅·네트워크 Amazon Web Services·Cloudflare·Google)
            </dd>
            <dd className="m-0 mt-1">목적·보유 기간: 데이터베이스·익명 로그인 · 2027년 2월 4일까지</dd>
            <dd className="m-0 mt-1">거부 방법·효과: 이용하지 않거나 5번에 따라 삭제할 수 있으며, 이 경우 서비스를 이용할 수 없습니다.</dd>
          </div>
        </dl>
        <p className="mt-3 mb-0">이전을 원하지 않으면 서비스를 이용하지 않거나 5번에 따라 삭제할 수 있으며, 이 경우 서비스를 이용할 수 없습니다.</p>
        <p className="mt-3 mb-0 font-bold text-gm-tx">국외 이전의 근거</p>
        <div className="mt-2">
          <Bullets
            items={[
              ...(POSTHOG_USERS && !OPT_OUT
                ? ["PostHog Inc.(미국): 이용자의 별도 동의를 받은 경우에만 이전합니다(개인정보 보호법 제28조의8 제1항 제1호). 동의는 언제든 철회할 수 있습니다."]
                : []),
              `Supabase Inc.·Vercel Inc.${OPT_OUT ? "·PostHog Inc." : ""}(미국): 서비스 제공(이용 계약 이행)에 필요한 처리위탁·보관으로서, 이 안내에 이전 항목·국가·시기와 방법·받는 자·목적과 보유 기간·거부 방법을 공개하고 이전합니다(개인정보 보호법 제28조의8 제1항 제3호 가목).${OPT_OUT ? " PostHog로의 이전은 ‘보내지 않기’로 거부할 수 있습니다." : ""}`,
            ]}
          />
        </div>
      </Section>

      <Section n={9} title="자동 수집 장치">
        이 웹사이트는 쿠키를 설정하지 않습니다. 대신 브라우저 저장 공간에 익명 로그인 상태와 서비스 설정을 저장합니다. 브라우저 설정에서 사이트 데이터를 지우거나 막을 수
        있으며, 그러면 이 기기에서 기록을 이어서 볼 수 없습니다.
        {POSTHOG_USERS && " 이용 통계 분석을 보내는 경우 PostHog 식별값도 브라우저 저장 공간에 저장합니다."}
      </Section>

      <Section n={10} title="안전성 확보 조치">
        <Bullets
          items={[
            "데이터베이스 접근 제한: 이용자는 자기 정보만 읽고 쓸 수 있습니다.",
            "전송 구간 암호화(HTTPS)",
            "관리용 비밀 키는 웹사이트 코드에 넣지 않습니다.",
            "이용 기록에는 테스트 답변·키·체중을 넣지 않습니다.",
          ]}
        />
      </Section>

      <Section n={11} title="이용자의 권리">
        저장된 정보의 열람·정정·삭제·처리 정지를 요청할 수 있습니다. 러닝 기록은 앱에서 직접 수정·삭제할 수 있고, 전체 삭제는 5번 방법으로 합니다.
      </Section>

      <Section n={12} title="이용 대상">
        한국에 거주하는 만 19세 이상만 이용할 수 있습니다.
      </Section>

      <Section n={13} title="개인정보 보호 업무·고충 처리 부서">
        <Bullets
          items={[
            "초록소프트(ChoRockSoft) 신사업기획파트",
            "개인정보 실무담당자: 전진우 파트장",
            <>이메일: {PRIVACY_EMAIL}</>,
            <>전화번호: {PRIVACY_PHONE}</>,
          ]}
        />
      </Section>

      <Section n={14} title="시행일">
        2026년 10월 19일. 이 안내를 게시하기 전부터 서비스를 이용한 테스터에게는 이 안내를 직접 전달합니다.
        {OPT_OUT &&
          ` 변경(${koreanDate(NOTICE_VERSION)}): PostHog 이용 통계 분석을 동의한 경우에만 보내던 방식에서 ‘보내지 않기’로 거부할 수 있는 방식으로 바꿨습니다. 이전에 동의하지 않거나 철회한 경우는 계속 보내지 않습니다.`}
      </Section>
    </div>
  );
}
