// 허용된 이메일 목록 (프론트엔드와 동일하게 설정)
const ALLOWED_EMAILS = ['semoking@gmail.com', 'minxuan85@gmail.com'];

// 💡 [신규] 프론트엔드에서 넘어온 구글 인증 마패(JWT)를 해독하여 이메일을 확인하는 함수
function verifyGoogleToken(token) {
    if (!token) return false;
    try {
        // JWT는 3부분으로 나뉘며, 두 번째 부분이 데이터(Payload)입니다.
        const parts = token.split('.');
        if (parts.length !== 3) return false;

        // Base64 디코딩 후 JSON 파싱
        const payloadBlob = Utilities.base64DecodeWebSafe(parts[1]);
        const payloadString = Utilities.newBlob(payloadBlob).getDataAsString();
        const payload = JSON.parse(payloadString);

        // 해독된 이메일이 허용 목록에 있는지 검사
        if (payload.email && ALLOWED_EMAILS.includes(payload.email)) {
            return payload.email; // 검증 통과!
        }
        return false;
    } catch (e) {
        return false;
    }
}

function doGet(e) {
    try {
        // 🛡️ 보안 검문소: 토큰이 없거나 가짜면 즉시 쫓아냄
        const token = e.parameter.token;
        const verifiedEmail = verifyGoogleToken(token);
        if (!verifiedEmail) {
            throw new Error('Unauthorized Access: 유효하지 않은 접근입니다.');
        }

        const country = e.parameter.country || 'KR';
        const ss = SpreadsheetApp.getActiveSpreadsheet();

        // 1. 가계부 내역은 국가별 시트에서 가져오기
        const dataSheet = ss.getSheetByName('Data_' + country);
        let jsonData = [];
        if (dataSheet) {
            const dataValues = dataSheet.getDataRange().getValues();
            if (dataValues.length > 1) {
                const headers = dataValues[0];
                const rows = dataValues.slice(1);
                jsonData = rows.map((row) => {
                    let obj = {};
                    headers.forEach((header, index) => {
                        if (row[index] instanceof Date)
                            obj[header] = Utilities.formatDate(
                                row[index],
                                Session.getScriptTimeZone(),
                                'yyyy-MM-dd'
                            );
                        else obj[header] = row[index];
                    });
                    return obj;
                });
                jsonData.sort((a, b) => new Date(b.Date) - new Date(a.Date));
            }
        }

        // 2. 카테고리는 항상 공통 Category 시트에서 가져오기
        const catSheet = ss.getSheetByName('Category');
        let catData = [];
        if (catSheet) {
            const catValues = catSheet.getDataRange().getValues();
            if (catValues.length > 1) {
                const catHeaders = catValues[0];
                catData = catValues.slice(1).map((row) => {
                    let obj = {};
                    catHeaders.forEach((h, i) => (obj[h] = row[i]));
                    return obj;
                });
            }
        }

        // 💡 3. [신규] 예적금(Deposits) 데이터 가져오기 (기존 로직과 완전히 분리)
        const depositSheet = ss.getSheetByName('Deposits');
        let depositData = [];
        if (depositSheet) {
            const depValues = depositSheet.getDataRange().getValues();
            if (depValues.length > 1) {
                const headers = depValues[0];
                const rows = depValues.slice(1);
                depositData = rows.map((row) => {
                    let obj = {};
                    headers.forEach((header, index) => {
                        if (row[index] instanceof Date)
                            obj[header] = Utilities.formatDate(
                                row[index],
                                Session.getScriptTimeZone(),
                                'yyyy-MM-dd'
                            );
                        else obj[header] = row[index];
                    });
                    return obj;
                });
                // 예적금은 가입일 최신순으로 기본 정렬하여 내려보냅니다.
                depositData.sort((a, b) => new Date(b.가입일) - new Date(a.가입일));
            }
        }

        // 👇 4. [신규] 배당금(Dividends) 데이터 가져오기
        const divSheet = ss.getSheetByName('Dividends');
        let divData = [];
        if (divSheet) {
            const divValues = divSheet.getDataRange().getValues();
            if (divValues.length > 1) {
                const headers = divValues[0];
                const rows = divValues.slice(1);
                divData = rows.map((row) => {
                    let obj = {};
                    headers.forEach((header, index) => {
                        if (row[index] instanceof Date)
                            obj[header] = Utilities.formatDate(
                                row[index],
                                Session.getScriptTimeZone(),
                                'yyyy-MM-dd'
                            );
                        else obj[header] = row[index];
                    });
                    return obj;
                });
                // 최신 날짜순 정렬
                divData.sort((a, b) => new Date(b.Date) - new Date(a.Date));
            }
        }

        // 응답 JSON에 deposits 항목을 추가해서 리턴합니다.
        return ContentService.createTextOutput(
            JSON.stringify({
                status: 'success',
                data: jsonData,
                categories: catData,
                deposits: depositData,
                dividends: divData, // 👈 추가!
            })
        ).setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
        return ContentService.createTextOutput(
            JSON.stringify({ status: 'error', message: error.message })
        ).setMimeType(ContentService.MimeType.JSON);
    }
}

function doPost(e) {
    try {
        const payload = JSON.parse(e.postData.contents);

        // 🛡️ 보안 검문소: 토큰이 없거나 가짜면 즉시 쫓아냄
        const token = payload.token;
        const verifiedEmail = verifyGoogleToken(token);
        if (!verifiedEmail) {
            throw new Error('Unauthorized Access: 유효하지 않은 접근입니다.');
        }

        const action = payload.action || 'create';
        const country = payload.country || 'KR';
        const ss = SpreadsheetApp.getActiveSpreadsheet();

        // 1. 카테고리 추가/삭제 (항상 공통 Category 시트)
        if (action === 'add_category' || action === 'delete_category') {
            const catSheet = ss.getSheetByName('Category');
            if (action === 'add_category') {
                const value = 'cat_' + new Date().getTime();
                catSheet.appendRow([payload.catType, value, payload.catLabel]);
            } else {
                const data = catSheet.getDataRange().getValues();
                for (let i = 1; i < data.length; i++) {
                    if (data[i][1] === payload.catValue) {
                        catSheet.deleteRow(i + 1);
                        break;
                    }
                }
            }
            return ContentService.createTextOutput(
                JSON.stringify({ status: 'success' })
            ).setMimeType(ContentService.MimeType.JSON);
        }

        // 💡 2. [신규] 예적금(Deposits) 전용 CRUD 로직
        if (
            action === 'create_deposit' ||
            action === 'update_deposit' ||
            action === 'delete_deposit'
        ) {
            const depSheet = ss.getSheetByName('Deposits');

            if (action === 'create_deposit') {
                const id = Utilities.getUuid();
                depSheet.appendRow([
                    id,
                    payload.startDate, // B: 가입일
                    payload.endDate, // C: 만기일
                    payload.depType, // D: 종류
                    payload.principal, // E: 원금
                    payload.rate, // F: 이율
                    payload.taxType, // G: 과세여부 (복구됨!)
                    payload.preTax, // H: 세전이자
                    payload.postTax, // I: 세후이자
                    payload.owner, // J: 명의자
                    payload.bank, // K: 은행
                    payload.status || '', // L: 상태
                ]);
                return ContentService.createTextOutput(
                    JSON.stringify({ status: 'success' })
                ).setMimeType(ContentService.MimeType.JSON);
            }

            const data = depSheet.getDataRange().getValues();
            let rowIndex = -1;
            for (let i = 1; i < data.length; i++) {
                if (data[i][0] === payload.id) {
                    rowIndex = i + 1;
                    break;
                }
            }

            if (rowIndex > -1) {
                if (action === 'delete_deposit') {
                    depSheet.deleteRow(rowIndex);
                    return ContentService.createTextOutput(
                        JSON.stringify({ status: 'success' })
                    ).setMimeType(ContentService.MimeType.JSON);
                }

                if (action === 'update_deposit') {
                    var rowValues = depSheet
                        .getRange(rowIndex, 1, 1, depSheet.getLastColumn())
                        .getValues()[0];

                    rowValues[1] = payload.startDate;
                    rowValues[2] = payload.endDate;
                    rowValues[3] = payload.depType;
                    rowValues[4] = payload.principal;
                    rowValues[5] = payload.rate;
                    rowValues[6] = payload.taxType; // G: 과세여부 추가
                    rowValues[7] = payload.preTax; // H: 세전이자
                    rowValues[8] = payload.postTax; // I: 세후이자
                    rowValues[9] = payload.owner;
                    rowValues[10] = payload.bank;
                    rowValues[11] = payload.status;

                    depSheet.deleteRow(rowIndex);
                    depSheet.appendRow(rowValues);
                }
            }
            return ContentService.createTextOutput(
                JSON.stringify({ status: 'success' })
            ).setMimeType(ContentService.MimeType.JSON);
        }

        // 👇 여기서부터 복사해서 붙여넣으세요!
        // 💡 3. [신규] 배당금(Dividends) 전용 CRUD 로직
        if (
            action === 'create_dividend' ||
            action === 'update_dividend' ||
            action === 'delete_dividend'
        ) {
            const divSheet = ss.getSheetByName('Dividends');

            if (action === 'create_dividend') {
                const id = payload.id || Utilities.getUuid();
                divSheet.appendRow([
                    id, // A: ID
                    payload.date, // B: Date
                    payload.stock, // C: Stock
                    payload.broker, // D: Broker
                    payload.owner, // E: Owner
                    payload.gross, // F: Gross (세전)
                    payload.net, // G: Net (세후)
                ]);
                return ContentService.createTextOutput(
                    JSON.stringify({ status: 'success' })
                ).setMimeType(ContentService.MimeType.JSON);
            }

            const data = divSheet.getDataRange().getValues();
            let rowIndex = -1;
            for (let i = 1; i < data.length; i++) {
                if (data[i][0] === payload.id) {
                    rowIndex = i + 1;
                    break;
                }
            }

            if (rowIndex > -1) {
                if (action === 'delete_dividend') {
                    divSheet.deleteRow(rowIndex);
                    return ContentService.createTextOutput(
                        JSON.stringify({ status: 'success' })
                    ).setMimeType(ContentService.MimeType.JSON);
                }

                if (action === 'update_dividend') {
                    var rowValues = divSheet
                        .getRange(rowIndex, 1, 1, divSheet.getLastColumn())
                        .getValues()[0];

                    rowValues[1] = payload.date;
                    rowValues[2] = payload.stock;
                    rowValues[3] = payload.broker;
                    rowValues[4] = payload.owner;
                    rowValues[5] = payload.gross;
                    rowValues[6] = payload.net;

                    divSheet.deleteRow(rowIndex);
                    divSheet.appendRow(rowValues);
                }
            }
            return ContentService.createTextOutput(
                JSON.stringify({ status: 'success' })
            ).setMimeType(ContentService.MimeType.JSON);
        }

        // 3. 기존 가계부 내역 CRUD (국가별 시트 타겟팅) - 절대 건드리지 않음
        const sheet = ss.getSheetByName('Data_' + country);

        if (action === 'create') {
            const id = Utilities.getUuid();
            sheet.appendRow([
                id,
                payload.date,
                payload.userEmail,
                payload.type,
                payload.category,
                payload.amount,
                payload.memo,
                new Date(),
            ]);
            return ContentService.createTextOutput(
                JSON.stringify({ status: 'success' })
            ).setMimeType(ContentService.MimeType.JSON);
        }

        const data = sheet.getDataRange().getValues();
        let rowIndex = -1;
        for (let i = 1; i < data.length; i++) {
            if (data[i][0] === payload.id) {
                rowIndex = i + 1;
                break;
            }
        }

        if (action === 'delete') {
            sheet.deleteRow(rowIndex);
            return ContentService.createTextOutput(
                JSON.stringify({ status: 'success' })
            ).setMimeType(ContentService.MimeType.JSON);
        }

        if (action === 'update') {
            var rowValues = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
            rowValues[1] = payload.date;
            rowValues[3] = payload.type;
            rowValues[4] = payload.category;
            rowValues[5] = payload.amount;
            rowValues[6] = payload.memo;
            rowValues[7] = new Date();

            sheet.deleteRow(rowIndex);
            sheet.appendRow(rowValues);

            return ContentService.createTextOutput(
                JSON.stringify({ status: 'success' })
            ).setMimeType(ContentService.MimeType.JSON);
        }
    } catch (error) {
        return ContentService.createTextOutput(
            JSON.stringify({ status: 'error', message: error.message })
        ).setMimeType(ContentService.MimeType.JSON);
    }
}
