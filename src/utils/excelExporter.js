import * as XLSX from 'xlsx';

const COL_IDX = {
  GUIDE_ID: 1,
  MAJOR_CATEGORY: 2,
  MID_CATEGORY: 3,
  SUB_CATEGORY: 4,
  CONTENT: 5,
  OPINION_TYPE: 6,
  REVISED_DRAFT: 7,
  MODIFICATION_OPINION: 8,
  BASIS: 9,
  OPINION_AGREEMENT: 10,
  ISSUE_ITEM: 11,
  KAIT_OPINION: 12,
  KISA_OPINION: 13,
};

/**
 * 현재 상태를 원본 workbook에 반영하여 다운로드
 * @param {XLSX.WorkBook} rawWorkbook - 원본 workbook
 * @param {string} sheetName - 메인 시트명
 * @param {Record<string, Opinion[]>} opinionsMap - 현재 의견 데이터
 * @param {GuideItem[]} guideList - 가이드 목록
 * @param {string} fileName - 다운로드 파일명
 */
export function exportToExcel(rawWorkbook, sheetName, opinionsMap, guideList, fileName) {
  // 원본 workbook 복사
  const wb = XLSX.utils.book_new();

  // 원본 시트를 그대로 복사
  rawWorkbook.SheetNames.forEach((name) => {
    wb.Sheets[name] = rawWorkbook.Sheets[name];
    wb.SheetNames.push(name);
  });

  const sheet = wb.Sheets[sheetName];

  // 시트를 2D 배열로 변환
  const existingRows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    blankrows: true,
  });

  // 신규 추가된 의견만 필터링
  const newOpinions = [];
  Object.values(opinionsMap).forEach((opinions) => {
    opinions
      .filter((op) => op.isNew)
      .forEach((op) => newOpinions.push(op));
  });

  if (newOpinions.length > 0) {
    // 마지막 행 이후로 append
    newOpinions.forEach((op) => {
      const newRow = new Array(14).fill('');
      newRow[COL_IDX.GUIDE_ID] = op.guideId;

      // 가이드 계층 정보 채우기
      const guide = guideList.find((g) => g.guideId === op.guideId);
      if (guide) {
        newRow[COL_IDX.MAJOR_CATEGORY] = guide.majorCategory || '';
        newRow[COL_IDX.MID_CATEGORY] = guide.midCategory || '';
        newRow[COL_IDX.SUB_CATEGORY] = guide.subCategory || '';
        newRow[COL_IDX.CONTENT] = guide.content || '';
      }

      newRow[COL_IDX.OPINION_TYPE] = op.opinionType || '';
      newRow[COL_IDX.REVISED_DRAFT] = op.revisedDraft || '';
      newRow[COL_IDX.MODIFICATION_OPINION] = op.modificationOpinion || '';
      newRow[COL_IDX.BASIS] = op.basis || '';
      newRow[COL_IDX.OPINION_AGREEMENT] = op.opinionAgreement || '';
      newRow[COL_IDX.ISSUE_ITEM] = op.issueItem || '';
      newRow[COL_IDX.KAIT_OPINION] = op.kaitOpinion || '';
      newRow[COL_IDX.KISA_OPINION] = op.kisaOpinion || '';

      existingRows.push(newRow);
    });

    // 수정된 배열을 시트에 반영
    const updatedSheet = XLSX.utils.aoa_to_sheet(existingRows);
    wb.Sheets[sheetName] = updatedSheet;
  }

  // 파일 다운로드
  XLSX.writeFile(wb, fileName || '암호자산_식별가이드_검토의견_수정본.xlsx');
}
