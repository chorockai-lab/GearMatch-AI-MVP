// Privacy notice copy for /privacy — from docs/PRIVACY_NOTICE_DRAFT.md (operating policy confirmed 2026-10-19;
// effective date, contact person, Supabase / Vercel regions and plans confirmed by the operator the same day).
// Anything still waiting for legal / operating confirmation is wrapped in <Pending> so it is visibly marked
// and easy to find (grep "<Pending") before this page goes to Production. Do not publish while any remain.
// Facts here must match the code and DB: supabase/migrations/*.sql, src/lib/events/track.ts, src/lib/analytics/*.

export const PRIVACY_EMAIL = "chorock@chorock.co.kr";

/** Marks text that is not confirmed yet (legal review / operating check). */
function Pending({ children }: { children: React.ReactNode }) {
  return (
    <span className="mx-0.5 inline-block border border-gm-lime px-1.5 text-[13px] leading-5 font-bold text-gm-lime">
      확정 전 · {children}
    </span>
  );
}

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
              "브라우저 저장 공간에는 익명 로그인 상태와 서비스 설정이 저장됩니다.",
            ]}
          />
        </div>
      </Section>

      <Section n={2} title="이용 목적">
        <Bullets
          items={[
            "러닝 동물 결과와 내 러닝 기록·통계 보여 주기",
            "비슷한 신체 조건의 러닝화 정보 보여 주기(ITEMS) — 키·체중·발 사이즈를 입력한 경우에만",
            "서비스 개선을 위한 이용 통계(단계별 완료율 등) — 개인을 식별하지 않는 집계로 사용",
          ]}
        />
        <p className="mt-3 mb-0">
          항목별 처리 근거: <Pending>법적 검토 후 표시</Pending>
        </p>
      </Section>

      <Section n={3} title="보관 기간">
        <Bullets
          items={[
            <>
              외부 테스트 종료일(2026년 11월 4일 예정)로부터 <strong className="text-gm-tx">3개월</strong>(2027년 2월 4일)까지 보관한 뒤 삭제합니다.
            </>,
            <>
              법령에 따라 따로 보관해야 하는 정보가 있으면 그 기간을 따릅니다. <Pending>법적 검토</Pending>
            </>,
            <>
              서비스 제공 회사의 접속 기록은 각 회사의 보관 정책에 따라 일정 기간 남을 수 있습니다. <Pending>회사별 기간 확인</Pending>
            </>,
            "데이터베이스 자동 백업 기능은 사용하지 않습니다.",
          ]}
        />
      </Section>

      <Section n={4} title="삭제 방법">
        <Bullets
          items={[
            <>
              <strong className="text-gm-tx">앱 안에서 바로 삭제:</strong> 이 화면 맨 아래의 ‘내 데이터 삭제하기’를 누르면 지금 이 브라우저(앱)에서 쓰는 익명 계정과 그
              계정의 테스트 결과·러닝 습관·신체 정보·신발·러닝 기록·이용 기록이 모두 삭제되며 되돌릴 수 없습니다. 데이터를 만든 같은 브라우저(앱)에서 열어야 합니다.
            </>,
            <>
              <strong className="text-gm-tx">이메일 문의:</strong> {PRIVACY_EMAIL} — 삭제 방법을 안내합니다. 데이터를 만든 브라우저(앱)를 더 이상 쓸 수 없는 경우의 처리:{" "}
              <Pending>법적 검토</Pending>
            </>,
            "브라우저 데이터만 지우면 이 기기에서 기록을 불러올 수 없게 될 뿐, 서버의 기록은 삭제되지 않습니다.",
          ]}
        />
      </Section>

      <Section n={5} title="처리를 맡기는 회사와 국외 이전">
        <dl className="m-0">
          <div className="border-b border-gm-line py-3 first:pt-0">
            <dt className="text-[15px] font-bold text-gm-tx">Supabase Inc. (미국)</dt>
            <dd className="m-0 mt-1">데이터베이스·익명 로그인 — 1번의 정보 전체(접속 정보 포함)</dd>
            <dd className="m-0 mt-1">데이터베이스 위치: 대한민국 서울(ap-northeast-2)</dd>
          </div>
          <div className="border-b border-gm-line py-3">
            <dt className="text-[15px] font-bold text-gm-tx">Vercel Inc. (미국)</dt>
            <dd className="m-0 mt-1">웹사이트 제공(호스팅) — 접속 정보(IP·브라우저·요청 주소). 앱 데이터는 Vercel을 거치지 않고 Supabase로 바로 전송됩니다.</dd>
            <dd className="m-0 mt-1">서버 기능 실행 위치: 미국(iad1, 워싱턴 D.C.)</dd>
          </div>
          <div className="py-3 last:pb-0">
            <dt className="text-[15px] font-bold text-gm-tx">PostHog Inc. (미국)</dt>
            <dd className="m-0 mt-1">이용 통계 분석 — 현재 이용자의 정보는 보내지 않습니다(내부 점검용으로만 사용).</dd>
          </div>
        </dl>
        <p className="mt-3 mb-0">
          국외 이전 해당 여부와 고지 항목: <Pending>법적 검토</Pending>
        </p>
      </Section>

      <Section n={6} title="이용자의 권리">
        저장된 정보의 열람·정정·삭제·처리 정지를 요청할 수 있습니다. 러닝 기록은 앱에서 직접 수정·삭제할 수 있고, 전체 삭제는 4번 방법으로 합니다.
      </Section>

      <Section n={7} title="이용 대상">
        한국에 거주하는 만 19세 이상만 이용할 수 있습니다.
      </Section>

      <Section n={8} title="개인정보 담당">
        <Bullets
          items={[
            "초록소프트(ChoRockSoft)",
            "개인정보 실무담당자: 신사업기획파트 전진우 파트장",
            <>이메일: {PRIVACY_EMAIL}</>,
            <>
              개인정보 보호책임자: <Pending>지정 후 표시</Pending>
            </>,
          ]}
        />
      </Section>

      <Section n={9} title="시행일">
        2026년 10월 19일
      </Section>
    </div>
  );
}
