from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Date
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import Boolean, String



class User(Base):
    __tablename__ = "user"

    user_id = Column(Integer, primary_key=True, index=True)
    user_name = Column(String, nullable=False)
    user_account = Column(String, unique=True, nullable=False)
    user_pw = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    sites = relationship("Site", back_populates="owner")


class Site(Base):
    __tablename__ = "site"

    site_id = Column(Integer, primary_key=True, index=True)
    site_code = Column(String, nullable=False)
    site_name = Column(String, nullable=False)
    location = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user_id = Column(Integer, ForeignKey("user.user_id"), nullable=False)

    owner = relationship("User", back_populates="sites")
    site_data = relationship("SiteData", back_populates="site", cascade="all, delete")


class SiteData(Base):
    __tablename__ = "site_data"

    data_id = Column(Integer, primary_key=True, index=True)
    site_id = Column(Integer, ForeignKey("site.site_id"), nullable=False)

    upload_id = Column(Integer, nullable=False, index=True)   # ⭐ 新增

    the_date = Column(Date, nullable=False)
    the_hour = Column(Integer, nullable=False)

    gi = Column(Float, nullable=True)
    tm = Column(Float, nullable=True)
    eac = Column(Float, nullable=True)

    data_name = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    site = relationship("Site", back_populates="site_data")

class AfterData(Base):
    __tablename__ = "after_data"

    after_id = Column(Integer, primary_key=True, index=True)
    site_id = Column(Integer, ForeignKey("site.site_id"), nullable=False)


    # 對應原始 site_data
    data_id = Column(Integer, ForeignKey("site_data.data_id"), nullable=False)

    after_name = Column(String, nullable=False)

    before_rows = Column(Integer, nullable=False)
    after_rows = Column(Integer, nullable=False)
    removed_ratio = Column(Float, nullable=False)

    # ✅ 新欄位
    outlier_method = Column(String, nullable=True)     # iqr / zscore / isolation_forest
    gi_tm_applied = Column(Boolean, nullable=False)    # True / False
    outlier_params = Column(JSONB, nullable=True)      # 係數
    file_path = Column(String, nullable=True)          # 清洗後 CSV 檔案路徑

    created_at = Column(DateTime, default=datetime.utcnow)

    site_data = relationship("SiteData")


class TrainedModel(Base):
    __tablename__ = "trained_model"

    model_id = Column(Integer, primary_key=True, index=True)

    site_id = Column(Integer, ForeignKey("site.site_id"), nullable=False)
    data_id = Column(Integer, nullable=False)           # after_data.after_id

    model_type = Column(String, nullable=False)          # XGBoost / SVR / RandomForest / LSTM
    parameters = Column(JSONB, nullable=True)            # best_params
    file_path = Column(String, nullable=True)            # 模型檔案路徑
    trained_at = Column(DateTime, default=datetime.utcnow)
