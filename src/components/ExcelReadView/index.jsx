import React, { useMemo, useState, useEffect } from 'react';
import { useRecoilValue } from 'recoil';
import * as XLSX from 'xlsx';
import { rawExcelDataAtom, guideListAtom } from '../../store/guideState';
import { opinionsAtom, hasOpinionContent } from '../../store/opinionState';
import './ExcelReadView.css';

const DATA_START_ROW = 6; // rows 0-5 = header rows; row 5 = column names; row 6+ = data

// Opinion columns: 8 per set starting at col 6
// Set 0: cols 6-13,  Set 1: cols 14-21,  Set 2: cols 22-29, ...
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

const ExcelReadView = () => {
  const rawData     = useRecoilValue(rawExcelDataAtom);
  const guideList   = useRecoilValue(guideListAtom);
  const opinionsMap = useRecoilValue(opinionsAtom);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize]       = useState(50);

  const { columnHeader, dataRows, colCount } = useMemo(() => {
    if (!rawData) return { columnHeader: [], dataRows: [], colCount: 14 };

    const sheet = rawData.rawWorkbook.Sheets[rawData.sheetName];

    // blankrows:true 필수 — false 사용 시 빈 행이 제거되어 행 인덱스 틀어짐
    const allRows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      blankrows: true,
    });

    const colCount = Math.max(14, ...allRows.map((r) => r.length));

    // 마지막 헤더 행(행 6 = index 5)만 컬럼명으로 사용
    const columnHeader = allRows[DATA_START_ROW - 1] || [];
    const rawRows      = allRows.slice(DATA_START_ROW);

    let curGuideId = '';
    const opCounters = {}; // guideId → 소비된 Recoil 의견 수

    const dataRows = rawRows.map((rawRow) => {
      const cells = Array.from({ length: colCount }, (_, ci) => s(rawRow[ci]));
      const gid = cells[1];
      if (gid) curGuideId = gid;
      const myGid = curGuideId;

      // ── 가로 방향 의견 세트 개수 파악 ──
      const maxSets = Math.floor((cells.length - OP_COL_START) / OP_SET_SIZE);
      let setsInRow = 0;
      for (let setIdx = 0; setIdx < maxSets; setIdx++) {
        const base = OP_COL_START + setIdx * OP_SET_SIZE;
        if (cells.slice(base, base + OP_SET_SIZE).some((v) => v !== '')) {
          setsInRow++;
        }
      }

      if (setsInRow > 0) {
        const recoilOps = (opinionsMap[myGid] || []).filter(hasOpinionContent);
        const startIdx  = opCounters[myGid] ?? 0;

        for (let setIdx = 0; setIdx < setsInRow; setIdx++) {
          const base      = OP_COL_START + setIdx * OP_SET_SIZE;
          const recoilIdx = startIdx + setIdx;

          if (recoilIdx < recoilOps.length) {
            // Recoil 의견으로 덮어쓰기
            const op = recoilOps[recoilIdx];
            cells[base + 0] = op.opinionType         || '';
            cells[base + 1] = op.revisedDraft        || '';
            cells[base + 2] = op.modificationOpinion || '';
            cells[base + 3] = op.basis               || '';
            cells[base + 4] = op.opinionAgreement    || '';
            cells[base + 5] = op.issueItem           || '';
            cells[base + 6] = op.kaitOpinion         || '';
            cells[base + 7] = op.kisaOpinion         || '';
          } else {
            // Recoil에 의견이 없으면 해당 세트 비우기
            for (let c = base; c < base + OP_SET_SIZE; c++) cells[c] = '';
          }
        }

        opCounters[myGid] = startIdx + setsInRow;
      }

      return { cells, guideId: myGid, isFirst: !!gid };
    });

    // ── 원본 엑셀에 없는 새 Recoil 의견 추가 ──
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

  // 소스 데이터 바뀌면 첫 페이지로
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
        <table className="excel-table">

          {/* ── 컬럼명 헤더 행 (엑셀 6행만) ── */}
          <thead>
            <tr className="header-row header-row-main">
              <th className="col-rownum">#</th>
              {Array.from({ length: colCount }, (_, ci) => (
                <th key={ci} className={`header-cell col-w-${ci < 14 ? ci : 'ext'}`}>
                  {String(columnHeader[ci] ?? '')}
                </th>
              ))}
            </tr>
          </thead>

          {/* ── 데이터 행 (페이지네이션) ── */}
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
                    // CAIG ID 배지
                    if (ci === 1 && cell && isFirst) {
                      return (
                        <td key={ci} className={`data-cell col-w-${ci}`}>
                          <span className="er-id-badge">{cell}</span>
                        </td>
                      );
                    }

                    // 의견 유형 배지 (col 6, 14, 22, ...)
                    if (isOpTypeCol(ci) && cell) {
                      const badgeCls = OPINION_TYPE_CLS[cell] || '';
                      return (
                        <td key={ci} className={`data-cell col-w-${ci < 14 ? ci : 'ext'}`}>
                          <span className={`er-op-badge ${badgeCls}`}>{cell}</span>
                        </td>
                      );
                    }

                    // 연속 행의 가이드 정보 열 (1~5) 음영
                    if (!isFirst && !isNew && ci >= 1 && ci <= 5 && !cell) {
                      return <td key={ci} className="data-cell cell-continuation" />;
                    }

                    return (
                      <td
                        key={ci}
                        className={`data-cell col-w-${ci < 14 ? ci : 'ext'} ${!cell ? 'cell-blank' : ''}`}
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
          <button className="page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(1)} title="첫 페이지">«</button>
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
          <button className="page-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)} title="마지막 페이지">»</button>
          <span className="page-current-info">{currentPage} / {totalPages}</span>
        </div>
      </div>
    </div>
  );
};

export default ExcelReadView;
