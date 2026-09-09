from sqlalchemy.orm import Session
from models import Notification

class NotificationService:
    def notify(self, user_id: str, type: str, title: str, content: str, entity_type: str, entity_id: str, db: Session):
        notif = Notification(
            user_id=user_id,
            notification_type=type,
            title=title,
            content=content,
            entity_type=entity_type,
            entity_id=entity_id
        )
        db.add(notif)
        db.commit()
        db.refresh(notif)
        return notif

notification_service = NotificationService()
