// src/pages/PredictSolar.js
import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';

/* ── 誤差燈號組件 ── */
const ErrorLight = ({ pct }) => {
  if (pct === null || pct === undefined) return <span className="text-white/20 text-[10px]">—</span>;
  const v = Number(pct);
  if (v <= 5) return (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-2.5 rounded-full bg-green-400 shadow-[0_0_6px_rgba(34,197,94,0.5)]" />
      <span className="text-green-400 text-[10px] font-mono">{v.toFixed(1)}%</span>
    </span>
  );
  if (v <= 15) return (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-2.5 rounded-full bg-yellow-400 shadow-[0_0_6px_rgba(234,179,8,0.5)]" />
      <span className="text-yellow-400 text-[10px] font-mono">{v.toFixed(1)}%</span>
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-2.5 rounded-full bg-red-400 shadow-[0_0_6px_rgba(239,68,68,0.5)] animate-pulse" />
      <span className="text-red-400 text-[10px] font-mono">{v.toFixed(1)}%</span>
    </span>
  );
};

/* ── 整體診斷燈號 ── */
const OverallStatus = ({ avgError, label }) => {
  if (avgError === null || avgError === undefined) return null;
  const v = Number(avgError);
  let cfg = { color: 'text-green-400', bg: 'bg-green-500', shadow: 'shadow-[0_0_15px_rgba(34,197,94,0.4)]', label: '發電正常', desc: '預測與實際高度吻合' };
  if (v > 15) cfg = { color: 'text-red-400', bg: 'bg-red-500', shadow: 'shadow-[0_0_15px_rgba(239,68,68,0.4)]', label: '發電異常', desc: '偏差過大，請檢查設備' };
  else if (v > 5) cfg = { color: 'text-yellow-400', bg: 'bg-yellow-500', shadow: 'shadow-[0_0_15px_rgba(234,179,8,0.4)]', label: '需留意', desc: '環境干擾或輕微積塵' };

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex items-center justify-center">
        <div className={`size-8 rounded-full ${cfg.bg} ${cfg.shadow} animate-pulse`} />
      </div>
      <div className="flex flex-col">
        {label && <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest">{label}</p>}
        <span className={`text-sm font-black ${cfg.color}`}>{cfg.label}</span>
        <span className="text-[9px] text-white/30 italic">{cfg.desc}</span>
      </div>
    </div>
  );
};

/* ── 模型顏色表 ── */
const MODEL_COLORS = [
  { text: 'text-primary',    bg: 'bg-primary/15',    border: 'border-primary/30',    dot: 'bg-primary' },
  { text: 'text-cyan-400',   bg: 'bg-cyan-400/15',   border: 'border-cyan-400/30',   dot: 'bg-cyan-400' },
  { text: 'text-violet-400', bg: 'bg-violet-400/15', border: 'border-violet-400/30', dot: 'bg-violet-400' },
  { text: 'text-rose-400',   bg: 'bg-rose-400/15',   border: 'border-rose-400/30',   dot: 'bg-rose-400' },
  { text: 'text-emerald-400',bg: 'bg-emerald-400/15',border: 'border-emerald-400/30',dot: 'bg-emerald-400' },
  { text: 'text-orange-400', bg: 'bg-orange-400/15', border: 'border-orange-400/30', dot: 'bg-orange-400' },
];

export default function PredictSolar({ onBack, onNavigateToDashboard, onLogout, onNavigateToSites, onNavigateToTrain, onNavigateToPredict, onNavigateToModelMgmt }) {
  const [file, setFile] = useState(null);
  const [selectedModelIds, setSelectedModelIds] = useState([]);

  useEffect(() => {
    const modelId = localStorage.getItem("predict_model_id");
    if (modelId) {
      setSelectedModelIds([modelId]);
      localStorage.removeItem("predict_model_id");
    }
  }, []);

  const [trainedModels, setTrainedModels] = useState([]);
  const [isPredicting, setIsPredicting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // pagination
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(0);

  // Fetch trained models on mount
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || !user.user_id) {
      setError("找不到登入資訊，請重新登入");
      return;
    }
    const userId = user.user_id;
    fetch(`http://127.0.0.1:8000/train/trained-models?user_id=${userId}`)
      .then(async (r) => {
        const data = await r.json().catch(() => []);
        if (!r.ok) throw new Error(data?.detail || '取得模型失敗');
        return data;
      })
      .then((data) => {
        if (Array.isArray(data)) setTrainedModels(data);
      })
      .catch((e) => setError(e.message || '取得模型失敗'));
  }, []);

  const toggleModel = (modelId) => {
    const id = String(modelId);
    setSelectedModelIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handlePredict = async () => {
    if (!file || selectedModelIds.length === 0) return alert('請上傳資料並選擇至少一個模型');
    setIsPredicting(true);
    setError('');
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      // 單模型走原本 API，多模型走新 API
      if (selectedModelIds.length === 1) {
        formData.append('model_id', selectedModelIds[0]);
        const res = await fetch('http://127.0.0.1:8000/train/predict-file', {
          method: 'POST',
          body: formData,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.detail || '預測失敗');
        // 轉換為統一的多模型格式
        setResult({
          mode: 'single',
          models_summary: [{
            model_id: json.model_id,
            model_type: json.model_type,
            status: 'ok',
            total_predicted_eac: json.total_predicted_eac,
            avg_error_pct: json.avg_error_pct,
          }],
          total_rows: json.total_rows,
          columns: json.columns,
          rows: json.rows,
        });
      } else {
        formData.append('model_ids', selectedModelIds.join(','));
        const res = await fetch('http://127.0.0.1:8000/train/predict-file-multi', {
          method: 'POST',
          body: formData,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.detail || '預測失敗');
        setResult({ mode: 'multi', ...json });
      }
      setPage(0);
    } catch (e) {
      setError(e.message || '預測過程發生錯誤');
    } finally {
      setIsPredicting(false);
    }
  };

  const navProps = { onNavigateToDashboard, onNavigateToTrain, onNavigateToPredict, onNavigateToSites, onNavigateToModelMgmt, onLogout };

  // Pagination helpers
  const rows = result?.rows || [];
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const pagedRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const displayCols = result ? result.columns : [];

  // Build color map for selected models (for multi-model mode)
  const okModels = (result?.models_summary || []).filter(m => m.status === 'ok');
  const modelColorMap = {};
  okModels.forEach((m, i) => {
    modelColorMap[m.model_id] = MODEL_COLORS[i % MODEL_COLORS.length];
  });

  // Detect which columns are prediction/error columns
  const isPredCol = (col) => col.startsWith('pred_') || col === 'predicted_EAC';
  const isErrCol = (col) => col.startsWith('err_') || col === 'error_pct';

  // Get model info from column name like "pred_XGBoost_5"
  const getModelIdFromCol = (col) => {
    const parts = col.split('_');
    return parts.length >= 3 ? parseInt(parts[parts.length - 1]) : null;
  };

  return (
    <div className="min-h-screen w-full bg-background-dark text-white flex flex-col font-sans">
      <Navbar activePage="predict" {...navProps} />

      <main className="flex-1 w-full max-w-[1400px] mx-auto p-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* ── 左側：配置區 ── */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <section className="bg-white/[0.02] p-6 rounded-2xl border border-white/10 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-3 italic">
              <div className="size-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined !text-xl">settings_applications</span>
              </div>
              預測配置
            </h2>

            <div className="space-y-6">
              {/* 1. Upload */}
              <div>
                <label className="text-[11px] text-white/30 mb-2 block font-bold uppercase tracking-widest">1. 上傳預測資料</label>
                <div
                  className="group border-2 border-dashed border-white/10 rounded-2xl p-6 text-center hover:bg-white/[0.03] hover:border-primary/50 transition-all cursor-pointer"
                  onClick={() => document.getElementById('predictFileInput').click()}
                >
                  <input type="file" id="predictFileInput" hidden accept=".csv,.xlsx,.xls" onChange={(e) => setFile(e.target.files[0])} />
                  <div className="size-10 rounded-full bg-white/5 mx-auto mb-3 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <span className="material-symbols-outlined !text-xl text-white/30 group-hover:text-primary">upload_file</span>
                  </div>
                  <p className="text-xs font-bold text-white/50 group-hover:text-white transition-colors">{file ? file.name : 'CSV / XLSX 檔案'}</p>
                </div>
              </div>

              {/* 2. Multi-Model Select */}
              <div>
                <label className="text-[11px] text-white/30 mb-2 block font-bold uppercase tracking-widest">
                  2. 選擇訓練模型
                  <span className="ml-2 text-primary/60 normal-case">（可多選比對）</span>
                </label>
                <div className="max-h-[280px] overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                  {trainedModels.length === 0 && (
                    <p className="text-[10px] text-white/20 italic py-4 text-center">尚無可用模型</p>
                  )}
                  {trainedModels.map(m => {
                    const isSelected = selectedModelIds.includes(String(m.model_id));
                    return (
                      <label
                        key={m.model_id}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all border ${
                          isSelected
                            ? 'bg-primary/10 border-primary/30 shadow-[0_0_12px_rgba(242,204,13,0.08)]'
                            : 'border-white/5 hover:bg-white/[0.03] hover:border-white/10'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleModel(m.model_id)}
                          className="accent-primary size-3.5 rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                              isSelected ? 'bg-primary/20 text-primary' : 'bg-white/5 text-white/50'
                            }`}>
                              {m.model_type}
                            </span>
                            <span className="text-[10px] text-white/30 font-mono">#{m.model_id}</span>
                          </div>
                          <p className="text-[9px] text-white/20 mt-0.5 truncate">
                            {m.site_name} · {m.trained_at ? m.trained_at.slice(0, 16).replace('T', ' ') : ''}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
                {selectedModelIds.length > 0 && (
                  <p className="text-[10px] text-primary/60 mt-2 font-bold">
                    已選 {selectedModelIds.length} 個模型
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={handlePredict}
              disabled={isPredicting || !file || selectedModelIds.length === 0}
              className="w-full bg-primary text-background-dark py-4 rounded-2xl font-black text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-[0_10px_30px_rgba(242,204,13,0.2)] mt-6 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isPredicting ? '運算執行中...' : selectedModelIds.length > 1 ? `比對預測 (${selectedModelIds.length} 個模型)` : '開始執行預測'}
            </button>

            {error && (
              <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {error}
              </div>
            )}
          </section>

          {/* Summary cards — show per-model comparison */}
          {result && (
            <section className="space-y-3 animate-fade-in">
              {okModels.map((m, i) => {
                const c = MODEL_COLORS[i % MODEL_COLORS.length];
                return (
                  <div key={m.model_id} className={`${c.bg} border ${c.border} p-4 rounded-2xl`}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`size-2.5 rounded-full ${c.dot}`} />
                      <span className={`text-xs font-black ${c.text}`}>{m.model_type}</span>
                      <span className="text-[9px] text-white/30 font-mono">#{m.model_id}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest mb-1">預估發電量</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-black font-mono text-white">{m.total_predicted_eac?.toLocaleString() ?? '—'}</span>
                          <span className={`text-[10px] font-bold ${c.text}`}>kWh</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest mb-1">平均誤差</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-black font-mono text-white">{m.avg_error_pct !== null && m.avg_error_pct !== undefined ? m.avg_error_pct.toFixed(2) : '—'}</span>
                          <span className={`text-[10px] font-bold ${c.text}`}>%</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <OverallStatus avgError={m.avg_error_pct} />
                    </div>
                  </div>
                );
              })}
            </section>
          )}
        </div>

        {/* ── 右側：資料表格 ── */}
        <div className="lg:col-span-9 flex flex-col">
          <div className={`flex-1 w-full rounded-2xl border border-white/10 bg-white/[0.01] p-6 flex flex-col relative transition-all shadow-2xl ${!result && 'items-center justify-center border-dashed opacity-40 min-h-[500px]'}`}>
            {result ? (
              <div className="w-full flex flex-col animate-fade-in">
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined !text-base text-primary">table_chart</span>
                    預測結果 <span className="text-white/30 font-normal ml-2">共 {result.total_rows} 筆</span>
                  </h2>
                  {/* Model legend for multi-mode */}
                  {okModels.length > 1 && (
                    <div className="flex items-center gap-3">
                      {okModels.map((m, i) => {
                        const c = MODEL_COLORS[i % MODEL_COLORS.length];
                        return (
                          <span key={m.model_id} className="flex items-center gap-1.5">
                            <span className={`size-2 rounded-full ${c.dot}`} />
                            <span className={`text-[10px] font-bold ${c.text}`}>{m.model_type}#{m.model_id}</span>
                          </span>
                        );
                      })}
                    </div>
                  )}
                  {okModels.length === 1 && (
                    <div className="text-[10px] text-white/30">
                      模型：<span className="text-primary font-bold">{okModels[0].model_type}</span>
                    </div>
                  )}
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-xl border border-white/5">
                  <table className="w-full text-[10px] text-left whitespace-nowrap">
                    <thead className="bg-white/5 text-white/40 uppercase sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-2.5 font-bold">#</th>
                        {displayCols.map(col => {
                          const mid = getModelIdFromCol(col);
                          const c = mid !== null && modelColorMap[mid] ? modelColorMap[mid] : null;
                          const isHighlight = isPredCol(col) || isErrCol(col) || col === 'EAC';
                          // Clean column label
                          let label = col;
                          if (col === 'predicted_EAC') label = '預測 EAC';
                          else if (col === 'error_pct') label = '誤差%';
                          else if (col.startsWith('pred_')) {
                            const parts = col.replace('pred_', '').split('_');
                            label = `預測 ${parts.slice(0, -1).join('_')}`;
                          } else if (col.startsWith('err_')) {
                            const parts = col.replace('err_', '').split('_');
                            label = `誤差% ${parts.slice(0, -1).join('_')}`;
                          }
                          return (
                            <th key={col} className={`px-3 py-2.5 font-bold ${isHighlight ? (c ? c.text : 'text-primary') : ''}`}>
                              {label}
                            </th>
                          );
                        })}
                        {/* 單模型時顯示燈號欄 */}
                        {result.mode === 'single' && <th className="px-3 py-2.5 font-bold text-primary">燈號</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono text-white/70">
                      {pagedRows.map((row, idx) => {
                        const globalIdx = page * PAGE_SIZE + idx;
                        // For single mode, use original error_pct for row coloring
                        const singleErrPct = result.mode === 'single' ? row.error_pct : null;
                        const rowBg = singleErrPct !== null && singleErrPct !== undefined
                          ? (singleErrPct > 15 ? 'bg-red-500/[0.03]' : singleErrPct > 5 ? 'bg-yellow-500/[0.02]' : '')
                          : '';
                        return (
                          <tr key={globalIdx} className={`hover:bg-white/[0.03] transition-colors ${rowBg}`}>
                            <td className="px-3 py-2 text-white/20">{globalIdx + 1}</td>
                            {displayCols.map(col => {
                              const val = row[col];
                              const mid = getModelIdFromCol(col);
                              const c = mid !== null && modelColorMap[mid] ? modelColorMap[mid] : null;

                              let cellClass = 'px-3 py-2';
                              if (isPredCol(col)) cellClass += ` font-bold ${c ? c.text : 'text-primary'}`;
                              else if (col === 'EAC') cellClass += ' text-blue-400';
                              else if (isErrCol(col)) {
                                // Show as error light in multi mode
                                if (result.mode === 'multi') {
                                  return (
                                    <td key={col} className="px-3 py-2">
                                      <ErrorLight pct={val} />
                                    </td>
                                  );
                                }
                                cellClass += ' hidden'; // single mode: hidden, shown in light column
                              }

                              return (
                                <td key={col} className={cellClass}>
                                  {val === null || val === undefined ? '—' : typeof val === 'number' ? Number(val).toFixed(4) : String(val)}
                                </td>
                              );
                            })}
                            {result.mode === 'single' && (
                              <td className="px-3 py-2">
                                <ErrorLight pct={row.error_pct} />
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 text-[10px] text-white/40">
                    <span>顯示 {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, rows.length)} / {rows.length}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0}
                        className="px-3 py-1 rounded border border-white/10 hover:bg-white/5 disabled:opacity-20 transition-all"
                      >
                        上一頁
                      </button>
                      {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 7) pageNum = i;
                        else if (page < 3) pageNum = i;
                        else if (page > totalPages - 4) pageNum = totalPages - 7 + i;
                        else pageNum = page - 3 + i;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPage(pageNum)}
                            className={`px-2.5 py-1 rounded border transition-all ${page === pageNum ? 'border-primary text-primary bg-primary/10' : 'border-white/10 hover:bg-white/5'}`}
                          >
                            {pageNum + 1}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={page >= totalPages - 1}
                        className="px-3 py-1 rounded border border-white/10 hover:bg-white/5 disabled:opacity-20 transition-all"
                      >
                        下一頁
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="size-20 rounded-full bg-white/5 mx-auto flex items-center justify-center">
                  <span className="material-symbols-outlined !text-4xl text-white/10">query_stats</span>
                </div>
                <p className="text-sm font-bold text-white/20 tracking-widest uppercase">上傳資料並選擇模型後即可開始預測</p>
                <p className="text-[10px] text-white/10">可選擇多個模型進行比對分析</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <div className="p-8 border-t border-white/10 bg-background-dark/95 flex justify-end gap-6 backdrop-blur-xl">
        <button onClick={onBack || onNavigateToDashboard} className="text-xs font-bold text-white/30 hover:text-white transition-colors">回模型訓練</button>
        <button onClick={onNavigateToDashboard} className="px-10 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-xs hover:bg-white/10 hover:border-white/20 transition-all">返回首頁看板</button>
      </div>
    </div>
  );
}