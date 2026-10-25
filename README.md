# 변민삼박 가계부

Google 스프레드시트에 데이터를 저장하고 GitHub Pages에서 실행하는 가족용 가계부 웹앱입니다. 별도 서버 없이 Google Apps Script를 통해 스프레드시트와 통신합니다. GitHub Pages와 Google 서비스의 무료 제공 범위에서 운영할 수 있습니다.

## 주요 기능

- 한국 원화 및 중국 위안화 가계부
- 날짜별 내역 목록과 달력 보기
- 월별 통계, 카테고리별 비교, 누적 추이
- 예적금 및 배당금 관리와 명의자별 자산 통계
- 가족 생활기록: 날짜별 측정값 추이와 횟수·잔여량 관리
- 모바일 화면과 홈 화면 바로가기 지원

## 데이터 흐름

1. 사용자가 Google 계정으로 로그인합니다.
2. 웹앱이 Google Apps Script 웹 앱에 요청을 보냅니다.
3. Apps Script가 연결된 Google 스프레드시트에서 데이터를 읽고 씁니다.

허용할 계정은 [`js/config.js`](js/config.js)와 [`backend/Code.js`](backend/Code.js)의 `ALLOWED_EMAILS`에 동일하게 설정합니다. 앱을 포크해 사용하는 경우 OAuth 클라이언트 ID와 Apps Script URL도 본인의 값으로 바꿔야 합니다.

## 내 저장소에서 설정하기

### 1. 저장소와 Google OAuth 설정

1. 이 저장소를 포크하고 GitHub Pages를 `main` 브랜치에서 사용하도록 설정합니다.
2. Google Cloud Console에서 웹 애플리케이션 OAuth 클라이언트를 만듭니다.
3. 승인된 JavaScript 원본에 GitHub Pages 주소를 등록합니다. 예: `https://사용자명.github.io`
4. OAuth 클라이언트 ID를 [`index.html`](index.html)의 `data-client_id`에 입력합니다.
5. 사용할 이메일 주소를 `ALLOWED_EMAILS`에 입력합니다. 프론트엔드와 Apps Script 양쪽의 목록을 일치시킵니다.

### 2. 스프레드시트와 Apps Script 설정

1. Google 스프레드시트를 만들고 아래 표의 이름으로 시트 탭을 추가합니다. 첫 줄에는 각 시트의 헤더를 입력합니다.
2. 스프레드시트에서 **확장 프로그램 → Apps Script**를 엽니다.
3. [`backend/Code.js`](backend/Code.js)의 내용을 Apps Script 프로젝트에 추가합니다.
4. Apps Script를 웹 앱으로 배포합니다. 실행 사용자는 본인, 액세스 권한은 `모든 사용자`로 설정합니다.
5. 웹 앱 URL을 [`js/config.js`](js/config.js)의 `GAS_URL`에 입력합니다.

| 시트 이름 | 첫 줄 헤더 |
| --- | --- |
| `Data_KR` | `ID`, `Date`, `UserEmail`, `Type`, `Category`, `Amount`, `Memo`, `UpdatedAt` |
| `Data_CN` | `ID`, `Date`, `UserEmail`, `Type`, `Category`, `Amount`, `Memo`, `UpdatedAt` |
| `Category` | `Type`, `Value`, `Label` |
| `Deposits` | `ID`, `가입일`, `만기일`, `종류`, `원금`, `이율`, `과세여부`, `세전이자`, `세후이자`, `명의자`, `은행`, `상태` |
| `Dividends` | `ID`, `Date`, `Stock`, `Broker`, `Owner`, `Gross`, `Net` |
| `LifeTypes` | `ID`, `Name`, `Kind`, `Unit`, `Active` |
| `LifeRecords` | `ID`, `TypeID`, `Date`, `Person`, `Value`, `Memo`, `UpdatedAt` |

`LifeTypes`는 생활기록 종류를 정의합니다. `Kind`는 측정값 기록인 `measurement` 또는 증감량을 누적하는 `counter`를 사용하고, `Active`는 체크박스로 관리합니다. 예: `golf-pass`, `골프 이용권`, `counter`, `회`, 체크됨; `body-weight`, `몸무게`, `measurement`, `kg`, 체크됨.

`LifeRecords`의 `TypeID`는 `LifeTypes`의 `ID`와 연결됩니다. `measurement`의 `Value`는 측정값이고, `counter`는 충전·사용량을 부호 있는 숫자로 기록합니다. 예를 들어 이용권 20회를 충전하면 `20`, 한 번 사용하면 `-1`입니다. `Date`는 `YYYY-MM-DD` 형식으로 저장합니다.

`Category` 시트에는 가계부 카테고리와 카드, 자산 설정을 저장합니다. 예를 들어 `Type`은 `expense`, `income`, `card_KR`, `card_CN`, `asset_bank`, `asset_owner`, `asset_type`, `asset_tax`, `asset_broker` 등을 사용합니다. 카드의 `Label`은 `카드명|결제일` 형식입니다.

### 3. GitHub Pages 배포

저장소의 **Settings → Pages**에서 `Deploy from a branch`를 선택하고 `main` 브랜치를 지정합니다. 배포가 끝나면 표시된 사이트 주소에서 앱을 엽니다.

## Apps Script 자동 배포

`.github/workflows/deploy-gas.yml`은 `main` 브랜치에서 `backend/` 파일이 변경될 때 실행됩니다.

1. 로컬에 Node.js와 `@google/clasp`를 설치하고 Google 계정으로 `clasp login`을 실행합니다.
2. `.clasprc.json`의 내용을 GitHub 저장소 **Settings → Secrets and variables → Actions**에 `CLASPRC_JSON` 시크릿으로 등록합니다.
3. [`backend/.clasp.json`](backend/.clasp.json)의 `scriptId`를 본인 Apps Script 프로젝트 ID로 바꿉니다.
4. 워크플로 파일의 배포 ID와 [`js/config.js`](js/config.js)의 `GAS_URL`이 본인의 Apps Script 배포를 가리키는지 확인합니다.
5. `backend/`를 수정해 `main`에 푸시한 뒤 GitHub Actions 실행 결과를 확인합니다.

## 휴대폰 홈 화면에 추가

- **iPhone/iPad:** Safari의 공유 메뉴에서 **홈 화면에 추가**를 선택합니다.
- **Android:** Chrome 메뉴에서 **홈 화면에 추가**를 선택합니다. 삼성 인터넷에서는 메뉴의 **현재 페이지 추가 → 홈 화면**을 선택합니다.

## 라이선스

MIT License. 자세한 내용은 [LICENSE](LICENSE)를 참고하세요.
