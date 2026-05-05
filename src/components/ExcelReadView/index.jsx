import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import * as XLSX from 'xlsx';
import { rawExcelDataAtom, guideListAtom, selectedGuideIdAtom } from '../../store/guideState';
import { opinionsAtom, hasOpinionContent } from '../../store/opinionState';
import './ExcelReadView.css';

const DATA_START_ROW = 6;

// 의견 열: 8칸 단위, col 6부터
// Set 0: 6-13, Set 1: 14-21, Set 2: 22-29, ...
const OP_COL_START = 6;
const OP_SET_SIZE  = 8;

const OPINION_TYPE_CLS = {
  이의없음: 'badge-ok',
  내용오류: 'badge-error',
  추가필요: 'badge-add',
  삭제권고: 'badge-del',
  표현수정: 'badge-mod',
};

const s = (v) => String(v ?? '').trim();

/** col이 의견 유형 열인지 (6, 14, 22, ...) */
const isOpTypeCol = (ci) =>
  ci >= OP_COL_START && (ci - OP_COL_START) % OP_SET_SIZE === 0;

const getPageNums = (cur, total) => {
  const delta = 2;
  const nums = [];
  for (let i = Math.max(1, cur - delta); i <= Math.min(total, cur + delta); i++) {
    nums.push(i);
  }
  return nums;
};

// 기본 열 너비
const DEFAULT_COL_WIDTHS = {
  0: 32,   // 순번
  1: 100,  // CAIG ID
  2: 80,   // 대목차
  3: 80,   // 중목차
  4: 90,   // 세부목차
  5: 260,  // 내용 (넓게)
  6: 70,   // 의견유형
  7: 120,  // 개정안
  8: 120,  // 수정의견
  9: 130,  // 근거
  10: 65,  // 의견일치
  11: 110, // 이슈사항
  12: 110, // KAIT
  13: 110, // KISA
};
const EXT_COL_WIDTH = 110; // 14번 이후 열

const ExcelReadView = () => {
  const rawData        = useRecoilValue(rawExcelDataAtom);
  const guideList      = useRecoilValue(guideListAtom);
  const opinionsMap    = useRecoilValue(opinionsAtom);
  const setSelectedId  = useSetRecoilState(selectedGuideIdAtom);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize]       = useState(50);
  const [colWidths, setColWidths]     = useState({});

  // ── 열 리사이즈 드래그 ──
  const resizeRef = useRef({ active: false, col: -1, startX: 0, startW: 0 });

  useEffect(() => {
    const onMove = (e) => {
      if (!resizeRef.current.active) return;
      const { col, startX, startW } = resizeRef.current;
      const newW = Math.max(40, startW + (e.clientX - startX));
      setColWidths((prev) => ({ ...prev, [col]: newW }));
    };
    const onUp = () => { resizeRef.current.active = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const startResize = useCallback((e, ci) => {
    e.preventDefault();
    e.stopPropagation();
    const def = DEFAULT_COL_WIDTHS[ci] ?? EXT_COL_WIDTH;
    resizeRef.current = {
      active: true,
      col: ci,
      startX: e.clientX,
      startW: colWidths[ci] ?? def,
    };
  }, [colWidths]);

  const getW = (ci) => colWidths[ci] ?? DEFAULT_COL_WIDTHS[ci] ?? EXT_COL_WIDTH;

  // ── 데이터 파싱 ──
  const { columnHeader, dataRows, colCount } = useMemo(() => {
    if (!rawData) return { columnHeader: [], dataRows: [], colCount: 14 };

    const sheet = rawData.rawWorkbook.Sheets[rawData.sheetName];
    const allRows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      blankrows: true,
    });

    const colCount = Math.max(14, ...allRows.map((r) => r.length));
    const columnHeader = allRows[DATA_START_ROW - 1] || [];
    const rawRows      = allRows.slice(DATA_START_ROW);

    let curGuideId = '';
    const opCounters = {};

    const dataRows = rawRows.map((rawRow) => {
      const cells = Array.from({ length: colCount }, (_, ci) => s(rawRow[ci]));
      const gid = cells[1];
      if (gid) curGuideId = gid;
      const myGid = curGuideId;

      const maxSets = Math.floor((cells.length - OP_COL_START) / OP_SET_SIZE);
      let setsInRow = 0;
      for (let si = 0; si < maxSets; si++) {
        const base = OP_COL_START + si * OP_SET_SIZE;
        if (cells.slice(base, base + OP_SET_SIZE).some((v) => v !== '')) setsInRow++;
      }

      if (setsInRow > 0) {
        const recoilOps = (opinionsMap[myGid] || []).filter(hasOpinionContent);
        const startIdx  = opCounters[myGid] ?? 0;

        for (let si = 0; si < setsInRow; si++) {
          const base = OP_COL_START + si * OP_SET_SIZE;
          const ri   = startIdx + si;
          if (ri < recoilOps.length) {
            const op = recoilOps[ri];
            cells[base + 0] = op.opinionType         || '';
            cells[base + 1] = op.revisedDraft        || '';
            cells[base + 2] = op.modificationOpinion || '';
            cells[base + 3] = op.basis               || '';
            cells[base + 4] = op.opinionAgreement    || '';
            cells[base + 5] = op.issueItem           || '';
            cells[base + 6] = op.kaitOpinion         || '';
            cells[base + 7] = op.kisaOpinion         || '';
          } else {
            for (let c = base; c < base + OP_SET_SIZE; c++) cells[c] = '';
          }
        }
        opCounters[myGid] = startIdx + setsInRow;
      }

      return { cells, guideId: myGid, isFirst: !!gid };
    });

    // 새 Recoil 의견 (원본에 없음) 추가
    for (const guide of guideList) {
      const gid       = guide.guideId;
      const recoilOps = (opinionsMap[gid] || []).filter(hasOpinionContent);
      const used      = opCounters[gid] ?? 0;
      for (let i = used; i < recoilOps.length; i++) {
        const op    = recoilOps[i];
        const cells = new Array(colCount).fill('');
        cells[OP_COL_START + 0] = op.opinionType         || '';
        cells[OP_COL_START + 1] = op.revisedDraft        || '';
        cells[OP_COL_START + 2] = op.modificationOpinion || '';
        cells[OP_COL_START + 3] = op.basis               || '';
        cells[OP_COL_START + 4] = op.opinionAgreement    || '';
        cells[OP_COL_START + 5] = op.issueItem           || '';
        cells[OP_COL_START + 6] = op.kaitOpinion         || '';
        cells[OP_COL_START + 7] = op.kisaOpinion         || '';
        dataRows.push({ cells, guideId: gid, isFirst: false, isNew: true });
      }
    }

    return { columnHeader, dataRows, colCount };
  }, [rawData, guideList, opinionsMap]);

  useEffect(() => { setCurrentPage(1); }, [dataRows.length, pageSize]);

  if (!rawData && guideList.length === 0) {
    return (
      <div className="excel-empty">
        <span>📊</span>
        <p>엑셀 파일을 업로드하면 원본 형태가 표시됩니다.</p>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(dataRows.length / pageSize));
  const pagedRows  = dataRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pageNums   = getPageNums(currentPage, totalPages);

  return (
    <div className="excel-read-view">
      <div className="excel-table-wrap">
        <table className="excel-table" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: 32, minWidth: 32 }} />
            {Array.from({ length: colCount }, (_, ci) => (
              <col key={ci} style={{ width: getW(ci), minWidth: 40 }} />
            ))}
          </colgroup>

          {/* ── 헤더 ── */}
          <thead>
            <tr className="header-row header-row-main">
              <th className="col-rownum">#</th>
              {Array.from({ length: colCount }, (_, ci) => (
                <th key={ci} className="header-cell">
                  <span className="header-text">{String(columnHeader[ci] ?? '')}</span>
                  <div
                    className="col-resize-handle"
                    onMouseDown={(e) => startResize(e, ci)}
                  />
                </th>
              ))}
            </tr>
          </thead>

          {/* ── 데이터 행 ── */}
          <tbody>
            {pagedRows.map(({ cells, guideId, isFirst, isNew }, ri) => {
              const globalRi = (currentPage - 1) * pageSize + ri;

              return (
                <tr
                  key={`d${globalRi}`}
                  className={`data-row ${isNew ? 'row-new' : ''} ${!isFirst && !isNew ? 'op-continuation' : ''}`}
                >
                  <td className="col-rownum">{DATA_START_ROW + globalRi + 1}</td>

                  {cells.map((cell, ci) => {
                    // CAIG ID — 클릭 가능 배지
                    if (ci === 1 && cell && isFirst) {
                      return (
                        <td key={ci} className="data-cell">
                          <button
                            className="er-id-badge er-id-clickable"
                            onClick={() => setSelectedId(cell)}
                            title="클릭하여 검토 의견 보기"
                          >
                            {cell}
                          </button>
                        </td>
                      );
                    }

                    // 의견 유형 배지
                    if (isOpTypeCol(ci) && cell) {
                      const badgeCls = OPINION_TYPE_CLS[cell] || '';
                      return (
                        <td key={ci} className="data-cell">
                          <span className={`er-op-badge ${badgeCls}`}>{cell}</span>
                        </td>
                      );
                    }

                    // 연속 행 가이드 정보 음영
                    if (!isFirst && !isNew && ci >= 1 && ci <= 5 && !cell) {
                      return <td key={ci} className="data-cell cell-continuation" />;
                    }

                    return (
                      <td
                        key={ci}
                        className={`data-cell ${!cell ? 'cell-blank' : ''}`}
                      >
                        {cell}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── 페이지네이션 ── */}
      <div className="excel-pagination">
        <div className="pagination-left">
          <span className="pagination-info">
            총 <strong>{dataRows.length}</strong>행
          </span>
          <span className="pagination-size-label">페이지당</span>
          {[20, 50, 100].map((sz) => (
            <button
              key={sz}
              className={`page-size-btn ${pageSize === sz ? 'active' : ''}`}
              onClick={() => setPageSize(sz)}
            >
              {sz}
            </button>
          ))}
        </div>

        <div className="pagination-right">
          <button className="page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>«</button>
          <button className="page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>‹ 이전</button>
          {pageNums[0] > 1 && <span className="page-ellipsis">…</span>}
          {pageNums.map((n) => (
            <button
              key={n}
              className={`page-btn ${n === currentPage ? 'page-btn-active' : ''}`}
              onClick={() => setCurrentPage(n)}
            >
              {n}
            </button>
          ))}
          {pageNums[pageNums.length - 1] < totalPages && <span className="page-ellipsis">…</span>}
          <button className="page-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>다음 ›</button>
          <button className="page-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)}>»</button>
          <span className="page-current-info">{currentPage} / {totalPages}</span>
        </div>
      </div>
    </div>
  );
};

export default ExcelReadView;
