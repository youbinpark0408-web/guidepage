import * as XLSX from 'xlsx';

const DATA_START_ROW = 6;

// Opinion columns: 8 columns per set, starting at col 6
// Set 0: cols 6-13, Set 1: cols 14-21, Set 2: cols 22-29, ...
const OP_COL_START = 6;
const OP_SET_SIZE = 8;

const COL = {
  GUIDE_ID:        1,
  MAJOR_CATEGORY:  2,
  MID_CATEGORY:    3,
  SUB_CATEGORY:    4,
  CONTENT:         5,
};

const safeStr = (val) =>
  val === undefined || val === null ? '' : String(val).trim();

const hasOpinionData = (...fields) => fields.some((f) => f !== '');

/**
 * 행에서 의견 세트를 모두 추출합니다 (가로 방향 다중 의견 지원)
 * cols 6-13 = set 0, cols 14-21 = set 1, ...
 */
function extractOpinionSets(row) {
  const sets = [];
  if (!row || row.length <= OP_COL_START) return sets;

  const maxSets = Math.floor((row.length - OP_COL_START) / OP_SET_SIZE);
  for (let s = 0; s < maxSets; s++) {
    const base = OP_COL_START + s * OP_SET_SIZE;
    const opinionType         = safeStr(row[base + 0]);
    const revisedDraft        = safeStr(row[base + 1]);
    const modificationOpinion = safeStr(row[base + 2]);
    const basis               = safeStr(row[base + 3]);
    const opinionAgreement    = safeStr(row[base + 4]);
    const issueItem           = safeStr(row[base + 5]);
    const kaitOpinion         = safeStr(row[base + 6]);
    const kisaOpinion         = safeStr(row[base + 7]);

    if (hasOpinionData(
      opinionType, revisedDraft, modificationOpinion, basis,
      opinionAgreement, issueItem, kaitOpinion, kisaOpinion,
    )) {
      sets.push({
        opinionType, revisedDraft, modificationOpinion, basis,
        opinionAgreement, issueItem, kaitOpinion, kisaOpinion,
      });
    }
  }
  return sets;
}

/**
 * ArrayBuffer(Uint8Array) → 파싱 결과
 *
 * blankrows:true — 빈 행 유지로 행 인덱스 안정성 보장
 * 병합 셀(merged cell) 연속 행도 currentGuideId에 귀속
 * 한 행에 가로로 여러 의견 세트가 있을 경우 모두 개별 의견으로 추출
 */
export function parseExcelFile(buffer) {
  const workbook = XLSX.read(buffer, { type: 'array' });

  const sheetName =
    workbook.SheetNames.find((n) => n.includes('검토의견')) ||
    workbook.SheetNames[2] ||
    workbook.SheetNames[0];

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    blankrows: true, // 빈 행 유지 — 인덱스 틀어짐 방지
  });

  const guideMap   = new Map();
  const opinionsMap = {};

  let currentGuideId = '';
  let currentMajor   = '';
  let currentMid     = '';
  let currentSub     = '';

  for (let i = DATA_START_ROW; i < rows.length; i++) {
    const row        = rows[i];
    const rawGuideId = safeStr(row[COL.GUIDE_ID]);

    // ── 가이드 컨텍스트 갱신 ──
    if (rawGuideId) {
      currentGuideId = rawGuideId;
      if (safeStr(row[COL.MAJOR_CATEGORY])) currentMajor = safeStr(row[COL.MAJOR_CATEGORY]);
      if (safeStr(row[COL.MID_CATEGORY]))   currentMid   = safeStr(row[COL.MID_CATEGORY]);
      if (safeStr(row[COL.SUB_CATEGORY]))   currentSub   = safeStr(row[COL.SUB_CATEGORY]);
      const content = safeStr(row[COL.CONTENT]);

      if (!guideMap.has(currentGuideId)) {
        guideMap.set(currentGuideId, {
          guideId: currentGuideId,
          majorCategory: currentMajor,
          midCategory:   currentMid,
          subCategory:   currentSub,
          content,
        });
      } else {
        const ex = guideMap.get(currentGuideId);
        if (!ex.majorCategory && currentMajor) ex.majorCategory = currentMajor;
        if (!ex.midCategory   && currentMid)   ex.midCategory   = currentMid;
        if (!ex.subCategory   && currentSub)   ex.subCategory   = currentSub;
        if (!ex.content       && content)      ex.content       = content;
      }
    } else {
      // 연속 행 (병합 셀) — currentGuideId에 귀속, 내용 보완
      if (currentGuideId && guideMap.has(currentGuideId)) {
        const ex = guideMap.get(currentGuideId);
        const content = safeStr(row[COL.CONTENT]);
        if (!ex.content       && content)                       ex.content       = content;
        if (!ex.majorCategory && safeStr(row[COL.MAJOR_CATEGORY])) ex.majorCategory = safeStr(row[COL.MAJOR_CATEGORY]);
        if (!ex.midCategory   && safeStr(row[COL.MID_CATEGORY]))   ex.midCategory   = safeStr(row[COL.MID_CATEGORY]);
        if (!ex.subCategory   && safeStr(row[COL.SUB_CATEGORY]))   ex.subCategory   = safeStr(row[COL.SUB_CATEGORY]);
      }
    }

    if (!currentGuideId) continue;

    // ── 가로 방향 다중 의견 세트 추출 ──
    const opSets = extractOpinionSets(row);
    if (opSets.length === 0) continue;

    if (!opinionsMap[currentGuideId]) opinionsMap[currentGuideId] = [];

    const now = new Date().toISOString();
    opSets.forEach(({ opinionType, revisedDraft, modificationOpinion, basis,
                      opinionAgreement, issueItem, kaitOpinion, kisaOpinion }, setIdx) => {
      opinionsMap[currentGuideId].push({
        id:   `${currentGuideId}_r${i}_s${setIdx}`,
        guideId: currentGuideId,
        opinionType,
        revisedDraft,
        modificationOpinion,
        basis,
        opinionAgreement,
        issueItem,
        kaitOpinion,
        kisaOpinion,
        isNew:     false,
        createdAt: now,
        rowIndex:  i,
        setIndex:  setIdx,
        versions: [
          {
            id:         `ver_${currentGuideId}_r${i}_s${setIdx}`,
            versionNum: 1,
            timestamp:  now,
            label:      'v1: 최초 업로드',
            section:    'created',
            snapshot: {
              opinionType, revisedDraft, modificationOpinion, basis,
              opinionAgreement, issueItem, kaitOpinion, kisaOpinion,
            },
          },
        ],
      });
    });
  }

  return {
    guideList: Array.from(guideMap.values()),
    opinions:  opinionsMap,
    rawWorkbook: workbook,
    sheetName,
  };
}
