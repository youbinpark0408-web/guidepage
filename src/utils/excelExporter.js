import * as XLSX from 'xlsx';

const DATA_START_ROW = 6;
const OP_COL_START   = 6;
const OP_SET_SIZE    = 8;

const safeStr = (v) => (v === undefined || v === null ? '' : String(v).trim());

function hasOpContent(op) {
  return !!(
    op.opinionType || op.revisedDraft || op.modificationOpinion || op.basis ||
    op.opinionAgreement || op.issueItem || op.kaitOpinion || op.kisaOpinion
  );
}

/**
 * 시트의 특정 셀 값만 업데이트 (원본 스타일·병합 유지)
 * 셀이 없으면 새로 생성
 */
function setCell(sheet, r, c, value) {
  const ref = XLSX.utils.encode_cell({ r, c });
  const str = String(value ?? '');
  if (sheet[ref]) {
    sheet[ref].v = str;
    sheet[ref].w = str;
    // 숫자/날짜 타입이었던 셀도 문자열로 변환
    if (sheet[ref].t !== 's') sheet[ref].t = 's';
  } else {
    if (str !== '') sheet[ref] = { v: str, t: 's' };
  }
}

/**
 * 원본 ArrayBuffer 기반으로 의견 데이터를 셀에 반영하여 다운로드
 *
 * @param {ArrayBuffer}   arrayBuffer  - IDB에 저장된 원본 파일 버퍼
 * @param {string}        sheetName    - 대상 시트명
 * @param {object}        opinionsMap  - 현재 Recoil 의견 데이터
 * @param {Array}         guideList    - 가이드 목록
 * @param {string}        fileName     - 저장 파일명
 */
export function exportToExcel(arrayBuffer, sheetName, opinionsMap, guideList, fileName) {
  if (!arrayBuffer) {
    alert('원본 파일 데이터가 없습니다. 파일을 다시 업로드해 주세요.');
    return;
  }

  // ── 원본 ArrayBuffer에서 workbook 재파싱 (원본 서식 완전 보존) ──
  const wb    = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array', cellStyles: true });
  const sheet = wb.Sheets[sheetName];
  if (!sheet) { console.error('시트 없음:', sheetName); return; }

  // 행 데이터 (인덱스 계산용 — 시트 구조는 건드리지 않음)
  const allRows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    blankrows: true,
  });

  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

  // ── 기존 의견 행 → Recoil 의견으로 셀 값 업데이트 ──
  let curGuideId  = '';
  const opCounters = {};

  for (let i = DATA_START_ROW; i < allRows.length; i++) {
    const row = allRows[i];
    const gid = safeStr(row[1]);
    if (gid) curGuideId = gid;
    if (!curGuideId) continue;

    // 이 행의 의견 세트 수 파악
    const maxSets = Math.floor((row.length - OP_COL_START) / OP_SET_SIZE);
    let setsInRow = 0;
    for (let s = 0; s < maxSets; s++) {
      const base = OP_COL_START + s * OP_SET_SIZE;
      if (row.slice(base, base + OP_SET_SIZE).some((v) => safeStr(v) !== '')) {
        setsInRow++;
      }
    }
    if (setsInRow === 0) continue;

    const recoilOps = (opinionsMap[curGuideId] || []).filter(hasOpContent);
    const startIdx  = opCounters[curGuideId] ?? 0;

    for (let s = 0; s < setsInRow; s++) {
      const base = OP_COL_START + s * OP_SET_SIZE;
      const ri   = startIdx + s;

      if (ri < recoilOps.length) {
        const op = recoilOps[ri];
        setCell(sheet, i, base + 0, op.opinionType         ?? '');
        setCell(sheet, i, base + 1, op.revisedDraft        ?? '');
        setCell(sheet, i, base + 2, op.modificationOpinion ?? '');
        setCell(sheet, i, base + 3, op.basis               ?? '');
        setCell(sheet, i, base + 4, op.opinionAgreement    ?? '');
        setCell(sheet, i, base + 5, op.issueItem           ?? '');
        setCell(sheet, i, base + 6, op.kaitOpinion         ?? '');
        setCell(sheet, i, base + 7, op.kisaOpinion         ?? '');
      } else {
        // 의견이 삭제된 경우 → 셀 비우기
        for (let c = base; c < base + OP_SET_SIZE; c++) setCell(sheet, i, c, '');
      }
    }

    opCounters[curGuideId] = startIdx + setsInRow;
  }

  // ── 신규 의견 (isNew:true) → 시트 끝에 행 추가 ──
  let appendR = range.e.r + 1;

  for (const guide of guideList) {
    const gid       = guide.guideId;
    const recoilOps = (opinionsMap[gid] || []).filter(hasOpContent);
    const used      = opCounters[gid] ?? 0;

    for (let i = used; i < recoilOps.length; i++) {
      const op = recoilOps[i];
      if (!op.isNew) continue;

      setCell(sheet, appendR, 1, op.guideId);
      setCell(sheet, appendR, 2, guide.majorCategory ?? '');
      setCell(sheet, appendR, 3, guide.midCategory   ?? '');
      setCell(sheet, appendR, 4, guide.subCategory   ?? '');
      setCell(sheet, appendR, 5, guide.content        ?? '');

      setCell(sheet, appendR, OP_COL_START + 0, op.opinionType         ?? '');
      setCell(sheet, appendR, OP_COL_START + 1, op.revisedDraft        ?? '');
      setCell(sheet, appendR, OP_COL_START + 2, op.modificationOpinion ?? '');
      setCell(sheet, appendR, OP_COL_START + 3, op.basis               ?? '');
      setCell(sheet, appendR, OP_COL_START + 4, op.opinionAgreement    ?? '');
      setCell(sheet, appendR, OP_COL_START + 5, op.issueItem           ?? '');
      setCell(sheet, appendR, OP_COL_START + 6, op.kaitOpinion         ?? '');
      setCell(sheet, appendR, OP_COL_START + 7, op.kisaOpinion         ?? '');

      appendR++;
    }
  }

  // !ref 범위 확장 (신규 행이 있을 때)
  if (appendR > range.e.r + 1) {
    range.e.r = appendR - 1;
    sheet['!ref'] = XLSX.utils.encode_range(range);
  }

  XLSX.writeFile(wb, fileName || '암호자산_식별가이드_검토의견_수정본.xlsx');
}
