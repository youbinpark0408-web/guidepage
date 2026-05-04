import * as XLSX from 'xlsx';

const HEADER_ROW_INDEX = 5;
const DATA_START_ROW = 6;

const COL = {
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

const safeStr = (val) =>
  val === undefined || val === null ? '' : String(val).trim();

const hasOpinionData = (...fields) => fields.some((f) => f !== '');

/**
 * ArrayBuffer(Uint8Array) → 파싱 결과
 */
export function parseExcelFile(buffer) {
  const workbook = XLSX.read(buffer, { type: 'array' });

  const sheetName =
    workbook.SheetNames.find((n) => n.includes('검토의견')) ||
    workbook.SheetNames[2];

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  const guideMap = new Map();
  const opinionsMap = {};

  let currentGuideId = '';
  let currentMajor = '';
  let currentMid = '';
  let currentSub = '';

  for (let i = DATA_START_ROW; i < rows.length; i++) {
    const row = rows[i];
    const rawGuideId = safeStr(row[COL.GUIDE_ID]);
    if (!rawGuideId) continue;

    currentGuideId = rawGuideId;
    if (safeStr(row[COL.MAJOR_CATEGORY])) currentMajor = safeStr(row[COL.MAJOR_CATEGORY]);
    if (safeStr(row[COL.MID_CATEGORY])) currentMid = safeStr(row[COL.MID_CATEGORY]);
    if (safeStr(row[COL.SUB_CATEGORY])) currentSub = safeStr(row[COL.SUB_CATEGORY]);
    const content = safeStr(row[COL.CONTENT]);

    if (!guideMap.has(currentGuideId)) {
      guideMap.set(currentGuideId, {
        guideId: currentGuideId,
        majorCategory: currentMajor,
        midCategory: currentMid,
        subCategory: currentSub,
        content,
      });
    } else {
      const ex = guideMap.get(currentGuideId);
      if (!ex.majorCategory && currentMajor) ex.majorCategory = currentMajor;
      if (!ex.midCategory && currentMid) ex.midCategory = currentMid;
      if (!ex.subCategory && currentSub) ex.subCategory = currentSub;
      if (!ex.content && content) ex.content = content;
    }

    const opinionType = safeStr(row[COL.OPINION_TYPE]);
    const revisedDraft = safeStr(row[COL.REVISED_DRAFT]);
    const modificationOpinion = safeStr(row[COL.MODIFICATION_OPINION]);
    const basis = safeStr(row[COL.BASIS]);
    const opinionAgreement = safeStr(row[COL.OPINION_AGREEMENT]);
    const issueItem = safeStr(row[COL.ISSUE_ITEM]);
    const kaitOpinion = safeStr(row[COL.KAIT_OPINION]);
    const kisaOpinion = safeStr(row[COL.KISA_OPINION]);

    // 모든 의견 필드가 비어있으면 저장하지 않음
    if (
      !hasOpinionData(
        opinionType, revisedDraft, modificationOpinion, basis,
        opinionAgreement, issueItem, kaitOpinion, kisaOpinion
      )
    ) {
      continue;
    }

    if (!opinionsMap[currentGuideId]) opinionsMap[currentGuideId] = [];

    const now = new Date().toISOString();
    opinionsMap[currentGuideId].push({
      id: `${currentGuideId}_${i}`,
      guideId: currentGuideId,
      opinionType,
      revisedDraft,
      modificationOpinion,
      basis,
      opinionAgreement,
      issueItem,
      kaitOpinion,
      kisaOpinion,
      isNew: false,
      createdAt: now,
      rowIndex: i,
      versions: [
        {
          id: `ver_${currentGuideId}_${i}`,
          versionNum: 1,
          timestamp: now,
          label: 'v1: 최초 업로드',
          section: 'created',
          snapshot: {
            opinionType, revisedDraft, modificationOpinion, basis,
            opinionAgreement, issueItem, kaitOpinion, kisaOpinion,
          },
        },
      ],
    });
  }

  return {
    guideList: Array.from(guideMap.values()),
    opinions: opinionsMap,
    rawWorkbook: workbook,
    sheetName,
  };
}
