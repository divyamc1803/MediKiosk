from fastapi import APIRouter, Depends, WebSocket
from sqlalchemy.orm import Session
from typing import List
import models
import schemas
import auth
from database import get_db
from websocket.manager import manager

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("", response_model=List[schemas.NotificationResponse])
def get_notifications(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Notification).filter(models.Notification.user_id == current_user.id).order_by(models.Notification.created_at.desc()).all()

@router.post("/{id}/read")
def read_notification(id: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    n = db.query(models.Notification).filter(models.Notification.id == id, models.Notification.user_id == current_user.id).first()
    if n:
        n.is_read = True
        db.commit()
    return {"status": "ok"}

@router.post("/read-all")
def read_all(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    db.query(models.Notification).filter(models.Notification.user_id == current_user.id).update({"is_read": True})
    db.commit()
    return {"status": "ok"}

@router.websocket("/ws/{user_id}")
async def notifications_ws(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, f"notifications_{user_id}")
    try:
        while True:
            await websocket.receive_text()
    except:
        manager.disconnect(websocket, f"notifications_{user_id}")
