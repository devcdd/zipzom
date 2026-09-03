import type { ReactNode } from 'react';
import { LegalSection } from '@/shared/ui';

const UPDATED = '2026년 9월 3일';
const CONTACT = 'developer.cdd@gmail.com';

const PROFILE_FIELDS =
  '생년월일, 혼인 상태, 혼인신고일, 자녀 수, 막내 자녀 생년월일, 가구원 수, 세대 월평균 소득, 맞벌이 여부, 무주택 여부, 총자산, 자동차가액, 대학생·취업준비생 여부, 주거급여 수급 여부, 주택청약종합저축 가입 여부, 산업단지 근로자 여부, 재직 기간, 거주 시도·시군구, 관심 지역';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 border-t border-line py-2 sm:grid-cols-[7rem_1fr] sm:gap-3">
      <dt className="text-[12px] font-medium text-ink">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/** 개인정보 처리방침. 실제 수집 항목은 users·user_profiles·user_bookmarks 스키마와 일치시켜 적는다. */
export function PrivacyPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">개인정보 처리방침</h1>
        <p className="mt-1 text-xs text-muted">최종 개정일 {UPDATED}</p>
      </div>

      <div className="card flex flex-col gap-6 p-6">
        <LegalSection title="1. 총칙">
          <p>
            집좀(이하 &lsquo;서비스&rsquo;)은 이용자의 개인정보를 소중히 다루며, 개인정보 보호법 등 관련 법령을 준수합니다. 이 방침은 서비스가 어떤 개인정보를 어떤 목적으로 처리하고 얼마나 보관하는지를 안내합니다.
          </p>
          <p>
            서비스는 로그인 없이도 공고 조회와 자격 판정을 이용할 수 있으며, 이 경우 개인정보를 수집하지 않습니다.
          </p>
        </LegalSection>

        <LegalSection title="2. 수집하는 개인정보 항목과 수집 방법">
          <dl className="flex flex-col text-[13px]">
            <Row label="카카오 로그인">
              카카오계정 이메일(필수 동의), 프로필 닉네임, 카카오 회원번호. 이용자가 카카오 로그인 화면에서 동의한 경우에만 카카오로부터 전달받습니다.
            </Row>
            <Row label="주거 조건">
              {PROFILE_FIELDS}. 이용자가 &lsquo;내 조건&rsquo; 화면에서 직접 입력합니다.
            </Row>
            <Row label="서비스 이용 기록">북마크한 공고, 자격 판정 이력(충족 계층과 판정 시각).</Row>
            <Row label="위치정보">
              지도의 &lsquo;내 위치&rsquo; 버튼을 누른 경우에만 브라우저에서 좌표를 확인하며, 서버로 전송하거나 저장하지 않습니다. 자세한 내용은{' '}
              <a href="#/terms" className="text-brand hover:underline">
                위치정보 이용약관
              </a>
              을 참고해 주세요.
            </Row>
          </dl>
          <p>서비스는 주민등록번호를 비롯한 고유식별정보와 민감정보를 수집하지 않습니다.</p>
        </LegalSection>

        <LegalSection title="3. 개인정보의 이용 목적">
          <ul className="list-disc pl-5">
            <li>회원 식별과 로그인 상태 유지</li>
            <li>입력한 주거 조건에 따른 임대주택 입주 자격 판정 및 공고 매칭</li>
            <li>북마크한 공고의 저장과 조회</li>
            <li>관리자 계정 확인(운영자 이메일 대조)</li>
          </ul>
          <p>서비스는 위 목적 외의 용도로 개인정보를 이용하지 않으며, 광고 목적의 프로파일링이나 자동화된 의사결정을 하지 않습니다.</p>
        </LegalSection>

        <LegalSection title="4. 서버에 저장하지 않는 선택지">
          <p>
            &lsquo;내 조건&rsquo; 화면에서 서버에 저장하지 않는 방식을 선택하면, 주거 조건은 이용자의 브라우저 저장소(localStorage)에만 보관되고 서버에는 생년월일만 남습니다. 이 경우 브라우저의 사이트 데이터를 삭제하면 조건도 함께 지워집니다.
          </p>
        </LegalSection>

        <LegalSection title="5. 개인정보의 보유 및 이용 기간">
          <p>
            수집한 개인정보는 회원 탈퇴 시까지 보유하며, 탈퇴 요청을 받으면 지체 없이 파기합니다. 회원 정보를 삭제하면 주거 조건, 북마크, 매칭 이력이 함께 삭제됩니다.
          </p>
          <p>
            현재 화면에서 직접 탈퇴하는 기능은 제공하지 않습니다. 아래 문의처로 가입한 카카오계정 이메일과 함께 삭제를 요청해 주시면 확인 후 처리합니다.
          </p>
          <p>법령에서 별도의 보존 의무를 정한 정보는 없으며, 결제·거래 정보를 취급하지 않습니다.</p>
        </LegalSection>

        <LegalSection title="6. 개인정보의 제3자 제공">
          <p>서비스는 이용자의 개인정보를 제3자에게 제공하지 않습니다.</p>
        </LegalSection>

        <LegalSection title="7. 개인정보 처리의 위탁">
          <p>서비스 제공에 필요한 범위에서 다음 업무를 위탁하고 있습니다.</p>
          <dl className="flex flex-col text-[13px]">
            <Row label="카카오">소셜 로그인 인증, 지도 표시. 로그인 과정에서 카카오가 이용자 동의를 받아 이메일과 닉네임을 전달합니다.</Row>
            <Row label="Amazon Web Services">서비스 서버와 데이터베이스 운영(국내 리전).</Row>
          </dl>
          <p>
            공고문 원문에서 입주 자격을 추출하는 데 외부 인공지능 서비스를 이용하지만, 이때 전송하는 자료는 공공기관이 공개한 모집공고문 파일뿐이며 이용자의 개인정보는 포함되지 않습니다.
          </p>
        </LegalSection>

        <LegalSection title="8. 이용자의 권리와 행사 방법">
          <ul className="list-disc pl-5">
            <li>열람·정정: 마이페이지와 &lsquo;내 조건&rsquo; 화면에서 언제든지 확인하고 수정할 수 있습니다.</li>
            <li>삭제: 문의처로 요청하시면 계정과 관련 정보를 모두 삭제합니다.</li>
            <li>처리 정지: 로그아웃하거나 삭제를 요청하면 개인정보 처리가 중단됩니다.</li>
          </ul>
        </LegalSection>

        <LegalSection title="9. 쿠키의 사용">
          <p>
            서비스는 로그인 상태 유지를 위해 세션 쿠키(<code className="rounded bg-surface-2 px-1">zz_session</code>) 하나를 사용합니다. 이 쿠키는 스크립트로 읽을 수 없도록 설정되어 있고 유효기간은 30일이며, 이용 중에는 자동으로 갱신됩니다.
          </p>
          <p>광고나 행태정보 분석을 위한 쿠키는 사용하지 않습니다. 브라우저 설정에서 쿠키를 차단하면 로그인이 필요한 기능을 이용할 수 없습니다.</p>
        </LegalSection>

        <LegalSection title="10. 개인정보의 안전성 확보 조치">
          <ul className="list-disc pl-5">
            <li>HTTPS를 통한 전송 구간 암호화</li>
            <li>세션 쿠키에 서명을 적용해 위조를 차단하고, 스크립트 접근을 막는 설정 적용</li>
            <li>관리자 기능은 사전에 등록된 운영자 계정만 접근 가능</li>
            <li>개인정보를 처리하는 인원을 운영자 1인으로 최소화</li>
          </ul>
        </LegalSection>

        <LegalSection title="11. 개인정보 보호책임자 및 문의">
          <p>
            개인정보 처리에 관한 문의, 열람·삭제 요청은{' '}
            <a href={`mailto:${CONTACT}`} className="text-brand hover:underline">
              {CONTACT}
            </a>
            으로 보내 주세요.
          </p>
          <p>
            개인정보 침해에 대한 신고·상담이 필요하면 개인정보침해신고센터(privacy.kisa.or.kr, 국번 없이 118), 개인정보 분쟁조정위원회(kopico.go.kr, 1833-6972) 등에 문의하실 수 있습니다.
          </p>
        </LegalSection>

        <LegalSection title="12. 방침의 변경">
          <p>이 방침의 내용이 변경되는 경우 시행일과 변경 내용을 이 페이지에 게시합니다.</p>
        </LegalSection>
      </div>

      <div className="flex gap-3 text-xs">
        <a href="#/terms" className="text-brand hover:underline">
          위치정보 이용약관
        </a>
        <a href="#/" className="text-brand hover:underline">
          공고 목록으로
        </a>
      </div>
    </div>
  );
}
