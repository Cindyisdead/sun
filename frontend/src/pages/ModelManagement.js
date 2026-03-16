import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';

export default function ModelManagement({
  onNavigateToDashboard,
  onNavigateToTrain,
  onNavigateToPredict,
  onNavigateToSites,
  onNavigateToModelMgmt,
  onLogout,
  activePage
}) {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);

  const navProps = {
    onNavigateToDashboard,
    onNavigateToTrain,
    onNavigateToPredict,
    onNavigateToSites,
    onNavigateToModelMgmt,
    onLogout
  };

  useEffect(() => {
    fetchTrainedModels();
  }, []);

  const fetchTrainedModels = async () => {
    try {
      setLoading(true);

      const userId = localStorage.getItem('user_id');
      if (!userId) {
        throw new Error('找不到登入資訊，請重新登入');
      }

      const res = await fetch(
        `http://127.0.0.1:8000/train/trained-models?user_id=${userId}`
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || '無法取得模型資料');
      }

      const data = await res.json();

      const mapped = data.map((item, index) => {
        const trainedDate = item.trained_at
          ? new Date(item.trained_at).toLocaleDateString('zh-TW')
          : '-';

        const bestAccuracy =
          item.parameters?.best_accuracy ??
          item.parameters?.r2 ??
          item.parameters?.accuracy ??
          null;

        return {
          id: item.model_id,
          siteDisplay:
            `${item.model_type || '-'}_${item.model_id} ` +
            (
              item.site_display ||
              (item.site_name && item.location
                ? `${item.site_name}[${item.location}]`
                : item.site_name
                  ? `[${item.site_name}]`
                  : '-')
            ),
          type: item.model_type || '-',
          date: trainedDate,
          accuracy: bestAccuracy !== null ? `${bestAccuracy}` : '-',
          status: index === 0 ? '已部署' : '閒置中',
        };
      });

      setModels(mapped);
    } catch (error) {
      console.error('取得模型列表失敗:', error);
      setModels([]);
      alert(error.message || '取得模型列表失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(`確定要刪除模型 ${id} 嗎？`);
    if (!confirmed) return;

    try {
      const userId = localStorage.getItem('user_id');
      if (!userId) {
        throw new Error('找不到登入資訊，請重新登入');
      }

      const res = await fetch(
        `http://127.0.0.1:8000/train/trained-models/${id}?user_id=${userId}`,
        {
          method: 'DELETE',
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.detail || '刪除模型失敗');
      }

      setModels((prev) => prev.filter((m) => m.id !== id));
      alert(`模型 ${id} 已成功刪除`);
    } catch (error) {
      console.error('刪除模型失敗:', error);
      alert(error.message || '刪除模型失敗');
    }
  };

  return (
    <div className="min-h-screen w-full bg-background-dark text-white flex flex-col font-sans">
      <Navbar activePage="model-mgmt" {...navProps} />

      <main className="flex-1 w-full max-w-7xl mx-auto p-6 py-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">模型管理中心</h1>
            <p className="text-white/40 text-sm mt-1">管理與追蹤所有已訓練完成的 AI 預測模型</p>
          </div>

          <div className="mt-4 md:mt-0 flex gap-4">
            <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-lg">
              <p className="text-[10px] text-white/40 uppercase font-bold">目前模型總數</p>
              <p className="text-xl font-black text-primary">{models.length}</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
            <p className="text-white/20 text-lg italic">資料載入中...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {models.length > 0 ? (
              models.map((model) => (
                <div
                  key={model.id}
                  className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between hover:bg-white/[0.04] transition-all group"
                >
                  <div className="flex items-center gap-6">
                    <div className="size-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-background-dark transition-colors">
                      <span className="material-symbols-outlined !text-3xl">psychology</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors">
                          {model.siteDisplay}
                        </h3>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase ${
                            model.status === '已部署'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-white/10 text-white/40'
                          }`}
                        >
                          {model.status}
                        </span>
                      </div>

                      <p className="text-xs text-white/40 mt-1.5 font-mono">
                        ID: {model.id} | 算法: {model.type} | 訓練日期: {model.date}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-10 mt-6 md:mt-0">
                    <div className="text-right">
                      <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest mb-1">
                        訓練表現
                      </p>
                      <p className="text-2xl font-black text-primary italic">
                        {model.accuracy}
                      </p>
                    </div>

                    <div className="flex gap-2 border-l border-white/10 pl-6">
                      <button
                        title="查看詳情"
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all"
                      >
                        <span className="material-symbols-outlined">visibility</span>
                      </button>

                      <button
                        onClick={() => handleDelete(model.id)}
                        title="刪除模型"
                        className="p-2.5 rounded-xl bg-red-500/5 hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-all"
                      >
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
                <p className="text-white/20 text-lg italic">目前尚無可顯示的模型</p>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="p-8 text-center text-white/10 text-[10px] font-bold uppercase tracking-[0.4em]">
        © 2025 SUNERGY ANALYTICS CENTER
      </footer>
    </div>
  );
}