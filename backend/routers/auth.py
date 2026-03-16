from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from database import get_db
from models import User
from schemas import RegisterUser, LoginUser

router = APIRouter(prefix="/auth", tags=["Auth"])
pwd_context = CryptContext(schemes=["sha256_crypt"], deprecated="auto")


# ===== 註冊 =====
@router.post("/register")
def register(user: RegisterUser, db: Session = Depends(get_db)):
    email = user.user_account.lower()   # ✅ 統一小寫（email）

    # 檢查是否已註冊
    exists = db.query(User).filter(User.user_account == email).first()
    if exists:
        raise HTTPException(status_code=400, detail="此電子信箱已被註冊")

    hashed_pw = pwd_context.hash(user.user_pw)

    new_user = User(
        user_name=user.user_name,
        user_account=email,   # ✅ email 存進 user_account
        user_pw=hashed_pw
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "註冊成功",
        "user_id": new_user.user_id
    }


# ===== 登入 =====
@router.post("/login")
def login(user: LoginUser, db: Session = Depends(get_db)):
    email = user.user_account.lower()

    u = db.query(User).filter(User.user_account == email).first()

    if not u or not pwd_context.verify(user.user_pw, u.user_pw):
        raise HTTPException(status_code=400, detail="電子信箱或密碼錯誤")

    return {
        "message": "登入成功",
        "user_id": u.user_id,
        "user_name": u.user_name,
        "user_account": u.user_account  # 👉 其實就是 email
    }
