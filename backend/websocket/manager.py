from typing import Dict, List
from fastapi import WebSocket


class ConnectionManager:
    """Small in-process pub/sub manager used by the demo WebSocket channels."""

    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, channel: str):
        await websocket.accept()
        self.active_connections.setdefault(channel, []).append(websocket)

    def disconnect(self, websocket: WebSocket, channel: str):
        connections = self.active_connections.get(channel)
        if not connections:
            return
        if websocket in connections:
            connections.remove(websocket)
        if not connections:
            self.active_connections.pop(channel, None)

    async def send_personal(self, data: dict, websocket: WebSocket):
        await websocket.send_json(data)

    async def broadcast(self, data: dict, channel: str):
        connections = list(self.active_connections.get(channel, []))
        stale = []
        for connection in connections:
            try:
                await connection.send_json(data)
            except Exception:
                stale.append(connection)
        for connection in stale:
            self.disconnect(connection, channel)


manager = ConnectionManager()
