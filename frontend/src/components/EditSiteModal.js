// components/EditSiteModal.js
import React, { useState } from "react";

const API_BASE_URL = "http://127.0.0.1:8000";

export default function EditSiteModal({ site, onClose, onUpdated }) {
  const [form, setForm] = useState({
    site_name: site.site_name || "",
    site_code: site.site_code || "",
    location: site.location || "",
  });

  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");

    // ✅ 前端驗證
    if (!form.site_code || !form.site_name || !form.location) {
      setError("請完整填寫案場代號、案場名稱與地點");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/site/${site.site_id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "更新失敗");
        return;
      }

      // ✅ ⭐ 把「更新後的完整資料」回傳給父層
      onUpdated?.({
        ...site,
        ...form,
      });
      
      window.dispatchEvent(new Event("site-updated"));

      onClose();

    } catch (err) {
      console.error(err);
      setError("伺服器連線失敗");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
      <div className="bg-[#1E1E1E] rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">編輯案場</h2>

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        {/* 案場名稱 */}
        <div className="mb-4">
          <label className="block text-sm text-white/60 mb-1">案場名稱</label>
          <input
            value={form.site_name}
            onChange={(e) =>
              setForm({ ...form, site_name: e.target.value })
            }
            className="w-full rounded-md bg-black/40 border border-white/20 px-3 py-2"
          />
        </div>

        {/* 案場代號 */}
        <div className="mb-4">
          <label className="block text-sm text-white/60 mb-1">案場代號</label>
          <input
            value={form.site_code}
            onChange={(e) =>
              setForm({ ...form, site_code: e.target.value })
            }
            className={`w-full rounded-md bg-black/40 px-3 py-2 font-mono
              border ${
                error.includes("代號")
                  ? "border-red-500"
                  : "border-white/20"
              }`}
          />
        </div>

        {/* 地點 */}
        <div className="mb-6">
          <label className="block text-sm text-white/60 mb-1">地點</label>
          <input
            value={form.location}
            onChange={(e) =>
              setForm({ ...form, location: e.target.value })
            }
            className="w-full rounded-md bg-black/40 border border-white/20 px-3 py-2"
          />
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-white/10 rounded">
            取消
          </button>
          <button onClick={handleSubmit} className="px-4 py-2 bg-primary rounded font-bold">
            儲存
          </button>
        </div>
      </div>
    </div>
  );
}
