from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import SiteData

router = APIRouter(
    prefix="/api/data",
    tags=["Data"]
)

@router.get("/latest-from-db")
def get_latest_from_db(db: Session = Depends(get_db)):
    """
    給 UnitAdjustment.js 用
    回傳最新一筆資料（不碰 CSV、不碰檔案）
    """
    latest = (
        db.query(SiteData)
        .order_by(SiteData.data_id.desc())
        .first()
    )

    if not latest:
        return {"rows": []}

    if not latest.json_data:
        raise HTTPException(status_code=400, detail="資料沒有 json_data")

    # json_data 本來就是 list[dict]
    return {
        "rows": latest.json_data[:1]  # 只拿第一列
    }
