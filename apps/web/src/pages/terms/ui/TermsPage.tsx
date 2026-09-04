import { LegalSection } from '@/shared/ui';

const UPDATED = '2026년 9월 3일';

/** 위치기반서비스 이용약관. 지도 '내 위치' 기능이 브라우저 위치 정보를 쓰므로 고지한다. */
export function TermsPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="page-title">위치정보 이용약관</h1>
        <p className="mt-1 text-xs text-muted">최종 개정일 {UPDATED}</p>
      </div>

      <div className="card flex flex-col gap-6 p-6">
        <LegalSection title="제1조 (목적)">
          <p>
            이 약관은 집좀(이하 &lsquo;서비스&rsquo;)이 제공하는 위치기반서비스의 이용 조건과 절차, 서비스와 이용자의 권리·의무를 정하는 것을 목적으로 합니다.
          </p>
        </LegalSection>

        <LegalSection title="제2조 (위치정보의 이용 목적)">
          <p>서비스는 지도 화면의 &lsquo;내 위치&rsquo; 기능에 한해 이용자의 위치정보를 이용하며, 그 목적은 다음과 같습니다.</p>
          <ul className="list-disc pl-5">
            <li>지도의 중심을 이용자의 현재 위치로 이동</li>
            <li>현재 위치 주변의 임대주택 공고 단지 확인</li>
          </ul>
        </LegalSection>

        <LegalSection title="제3조 (위치정보의 수집 방법)">
          <p>
            위치정보는 이용자가 지도 우측 하단의 위치 버튼을 직접 누른 경우에만, 웹 브라우저가 제공하는 Geolocation API를 통해 이용자의 명시적 동의(브라우저 권한 허용)를 받아 확인합니다. 버튼을 누르지 않으면 위치정보를 확인하지 않습니다.
          </p>
        </LegalSection>

        <LegalSection title="제4조 (위치정보의 저장 및 제3자 제공)">
          <p>
            확인된 좌표는 이용자의 브라우저 안에서 지도를 이동시키는 데에만 사용되며, <strong className="text-ink">서비스 서버로 전송되거나 저장되지 않습니다.</strong> 따라서 위치정보의 보유 기간은 없으며, 제3자에게 제공하거나 위탁하지 않습니다.
          </p>
          <p>
            다만 지도 표시를 위해 카카오 지도 SDK를 이용하며, 이 과정에서 지도 타일 요청 등 지도 서비스 제공에 필요한 통신이 발생할 수 있습니다. 이에 관한 사항은 카카오의 정책을 따릅니다.
          </p>
        </LegalSection>

        <LegalSection title="제5조 (이용자의 권리)">
          <p>
            이용자는 언제든지 위치정보 제공에 대한 동의를 철회할 수 있습니다. 브라우저의 사이트 권한 설정에서 위치 권한을 차단하면 즉시 적용됩니다. 동의를 철회하더라도 &lsquo;내 위치&rsquo; 기능을 제외한 공고 조회·매칭 등 나머지 서비스는 동일하게 이용할 수 있습니다.
          </p>
          <p>위치정보를 저장하지 않으므로 별도의 열람·정정·삭제 요청 절차는 두지 않습니다.</p>
        </LegalSection>

        <LegalSection title="제6조 (서비스의 변경 및 중지)">
          <p>
            서비스는 관련 법령의 개정, 기술적 사정 또는 운영상의 필요에 따라 위치기반서비스의 내용을 변경하거나 중지할 수 있으며, 이 경우 이 페이지를 통해 사전에 고지합니다.
          </p>
        </LegalSection>

        <LegalSection title="제7조 (면책)">
          <p>
            서비스가 제공하는 공고 정보는 LH·SH·HUG·마이홈포털 등 공공기관이 공개한 자료를 수집·가공한 것으로, 실제 모집공고문의 내용과 다를 수 있습니다. 최종 자격과 조건은 반드시 원문 공고문으로 확인하시기 바랍니다.
          </p>
          <p>천재지변, 브라우저·기기의 오류 등 서비스의 귀책사유가 없는 사유로 위치정보가 부정확하거나 제공되지 않는 경우 서비스는 책임을 지지 않습니다.</p>
        </LegalSection>

        <LegalSection title="제8조 (문의처)">
          <p>
            위치정보 이용에 관한 문의는{' '}
            <a href="mailto:developer.cdd@gmail.com" className="text-brand hover:underline">
              developer.cdd@gmail.com
            </a>
            으로 보내 주세요.
          </p>
        </LegalSection>
      </div>

      <div className="flex gap-3 text-xs">
        <a href="#/privacy" className="text-brand hover:underline">
          개인정보 처리방침
        </a>
        <a href="#/" className="text-brand hover:underline">
          공고 목록으로
        </a>
      </div>
    </div>
  );
}
