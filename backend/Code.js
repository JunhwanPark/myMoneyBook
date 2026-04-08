function doGet(e) {
    try {
        const country = e.parameter.country || 'KR'; // 국가 파라미터 (기본값 KR)
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

        return ContentService.createTextOutput(
            JSON.stringify({ status: 'success', data: jsonData, categories: catData })
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
        const action = payload.action || 'create';
        const country = payload.country || 'KR'; // 저장할 국가
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

        // 2. 가계부 내역 CRUD (국가별 시트 타겟팅)
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
            // 1. 기존 행의 데이터를 배열로 싹 복사해옵니다. (ID나 수정되지 않는 열을 보존하기 위함)
            var rowValues = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];

            // 2. 수정된 값들로 배열 내용을 갈아끼웁니다. (배열은 0부터 시작하므로 열 번호에서 -1을 합니다)
            rowValues[1] = payload.date; // 2열
            rowValues[3] = payload.type; // 4열
            rowValues[4] = payload.category; // 5열
            rowValues[5] = payload.amount; // 6열
            rowValues[6] = payload.memo; // 7열
            rowValues[7] = new Date(); // 8열 (수정일시)

            // 3. 기존에 있던 줄(행)을 시트에서 완전히 삭제합니다.
            sheet.deleteRow(rowIndex);

            // 4. 갈아끼워진 최신 데이터를 시트의 맨 아랫줄에 통째로 추가합니다!
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
