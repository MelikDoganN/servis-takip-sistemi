import httpx
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
import os
app = FastAPI()

# Backend adresi (local veya Railway)


BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8080")
# BACKEND_URL = "https://servis-takip-sistemi-production.up.railway.app"

# Bot'un kendi giriş bilgileri (backend'de kayıtlı olmalı)
BOT_EMAIL = "bot@servis.com"
BOT_PASSWORD = "bot123456"

# Token'ı saklamak için
bot_token = None

def get_token():
    """Backend'den token alır."""
    global bot_token
    if bot_token:
        return bot_token
    with httpx.Client() as client:
        resp = client.post(
            f"{BACKEND_URL}/auth/login",
            json={"email": BOT_EMAIL, "password": BOT_PASSWORD}
        )
        if resp.status_code == 200:
            bot_token = resp.json().get("token")
            return bot_token
        else:
            raise Exception("Token alınamadı")

@app.post("/webhook")
async def webhook(request: Request):
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    # Mesajı çözümle
    try:
        msg = data["entry"][0]["changes"][0]["value"]["messages"][0]
        phone = msg["from"]
        text = msg["text"]["body"].strip()
    except (KeyError, IndexError):
        return JSONResponse(content={"status": "ignored"}, status_code=200)

    print(f"📩 Mesaj geldi: {text} - Numaradan: {phone}")

    # Token al
    try:
        token = get_token()
    except Exception as e:
        return JSONResponse(content={"status": "error", "reply": "Token alınamadı"}, status_code=500)

    headers = {"Authorization": f"Bearer {token}"}
    response_text = "Anlamadım. Komutlar: !isliste, !guncelle [ID] [DURUM]"

    # !isliste komutu (teknisyenin WhatsApp numarasını filtre olarak gönder)
    if text.startswith("!isliste"):
        with httpx.Client() as client:
            try:
                resp = client.get(
                    f"{BACKEND_URL}/api/workorders?page=0&size=10&technicianWhatsapp={phone}",
                    headers=headers
                )
                if resp.status_code == 200:
                    orders = resp.json().get("content", [])
                    if orders:
                        lines = ["📋 İş Emirleriniz:"]
                        for o in orders[:5]:
                            lines.append(f"ID: {o['id']} - {o['status']} - {o['description'][:20]}...")
                        response_text = "\n".join(lines)
                    else:
                        response_text = "📭 Size atanmış iş emri bulunmuyor."
                else:
                    response_text = f"❗ Backend'den veri alınamadı (HTTP {resp.status_code})"
            except Exception as e:
                response_text = f"❗ Bağlantı hatası: {e}"

    # !guncelle komutu
    elif text.startswith("!guncelle"):
        parts = text.split()
        if len(parts) >= 3:
            work_order_id = parts[1]
            new_status = parts[2].upper()
            with httpx.Client() as client:
                try:
                    resp = client.put(
                        f"{BACKEND_URL}/api/workorders/{work_order_id}/status",
                        params={"status": new_status, "channel": "WHATSAPP"},
                        headers=headers
                    )
                    if resp.status_code == 200:
                        response_text = f"✅ İş emri {work_order_id} durumu {new_status} olarak güncellendi."
                    else:
                        response_text = f"❗ Güncellenemedi. Hata: {resp.status_code}"
                except Exception as e:
                    response_text = f"❗ Bağlantı hatası: {e}"
        else:
            response_text = "❗ Yanlış format. Kullanım: !guncelle [ID] [DURUM]"

    print(f"🤖 Bot yanıtı: {response_text}")
    return JSONResponse(content={"status": "received", "reply": response_text}, status_code=200)

@app.get("/")
def root():
    return {"message": "Servis Takip WhatsApp Botu Çalışıyor!"}