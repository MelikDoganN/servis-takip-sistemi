import os
import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

load_dotenv()

app = FastAPI()

# Ortam değişkenleri
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8080")
WHATSAPP_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID")
WHATSAPP_ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN")
BOT_EMAIL = os.getenv("BOT_EMAIL", "bot@servis.com")
BOT_PASSWORD = os.getenv("BOT_PASSWORD", "bot123456")

bot_token = None

def get_token():
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
            raise Exception("Backend token alınamadı")

async def get_user_role(phone: str):
    """WhatsApp numarasına göre kullanıcı rolünü döndürür: TECHNICIAN, CUSTOMER, UNREGISTERED"""
    try:
        token = get_token()
    except Exception:
        return "UNREGISTERED"

    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient() as client:
        # Önce teknisyen kontrolü
        resp = await client.get(
            f"{BACKEND_URL}/api/technicians/by-whatsapp/{phone}",
            headers=headers
        )
        if resp.status_code == 200:
            return "TECHNICIAN"
        # Sonra müşteri kontrolü
        resp = await client.get(
            f"{BACKEND_URL}/api/customers/by-whatsapp/{phone}",
            headers=headers
        )
        if resp.status_code == 200:
            return "CUSTOMER"
        return "UNREGISTERED"

async def send_whatsapp_message(to_number: str, message: str) -> bool:
    if not WHATSAPP_PHONE_NUMBER_ID or not WHATSAPP_ACCESS_TOKEN:
        print("⚠️ WhatsApp API bilgileri eksik.")
        return False
    url = f"https://graph.facebook.com/v25.0/{WHATSAPP_PHONE_NUMBER_ID}/messages"
    headers = {"Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}", "Content-Type": "application/json"}
    data = {"messaging_product": "whatsapp", "to": to_number, "type": "text", "text": {"body": message}}
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=data, headers=headers)
            print(f"📤 WhatsApp API yanıtı: {resp.status_code}")
            return resp.status_code == 200
    except Exception as e:
        print(f"❌ WhatsApp hatası: {e}")
        return False

async def send_interactive_buttons(to_number: str, body_text: str, buttons: list) -> bool:
    """WhatsApp butonlu mesaj gönderir (max 3 buton)."""
    url = f"https://graph.facebook.com/v25.0/{WHATSAPP_PHONE_NUMBER_ID}/messages"
    headers = {"Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}", "Content-Type": "application/json"}
    data = {
        "messaging_product": "whatsapp",
        "to": to_number,
        "type": "interactive",
        "interactive": {
            "type": "button",
            "body": {"text": body_text},
            "action": {"buttons": buttons}
        }
    }
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=data, headers=headers)
            print(f"📤 Butonlu mesaj API yanıtı: {resp.status_code}")
            return resp.status_code == 200
    except Exception as e:
        print(f"❌ Butonlu mesaj hatası: {e}")
        return False

# ---- WEBHOOK DOĞRULAMA (GET) ----
@app.get("/webhook")
async def verify_webhook(request: Request):
    print(">>> GET /webhook çağrıldı (doğrulama)")
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")
    print(f"mode: {mode}, token: {token}, challenge: {challenge}")
    if mode == "subscribe" and token == "123456":
        return int(challenge)
    return JSONResponse(content={"status": "error"}, status_code=403)

# ---- WEBHOOK MESAJ İŞLEME (POST) ----
@app.post("/webhook")
async def webhook(request: Request):
    print(">>> POST /webhook çağrıldı (mesaj)")
    try:
        data = await request.json()
    except Exception:
        return JSONResponse(content={"status": "error"}, status_code=400)

    try:
        entry = data["entry"][0]["changes"][0]["value"]
        if "messages" not in entry or not entry["messages"]:
            return JSONResponse(content={"status": "ignored"}, status_code=200)

        msg = entry["messages"][0]
        phone = msg["from"]
        msg_type = msg.get("type")
        text = None

        if msg_type == "text":
            text = msg["text"]["body"].strip()
            print(f"📩 Mesaj geldi: {text} - Numaradan: {phone}")
        elif msg_type == "interactive":
            interactive = msg["interactive"]
            if interactive["type"] == "button_reply":
                button_id = interactive["button_reply"]["id"]
                print(f"🔘 Buton tıklandı: {button_id} - Numaradan: {phone}")
                if button_id == "btn_islist":
                    text = "!isliste"
                elif button_id == "btn_guncelle":
                    text = "!guncelle"
                elif button_id == "btn_garanti":
                    text = "!garanti"
                elif button_id == "btn_durum":
                    text = "!durum"
                elif button_id == "btn_yardim":
                    text = "!yardim"
                else:
                    return JSONResponse(content={"status": "ignored"}, status_code=200)
        else:
            return JSONResponse(content={"status": "ignored"}, status_code=200)

        if not text:
            return JSONResponse(content={"status": "ignored"}, status_code=200)

        try:
            token = get_token()
        except Exception as e:
            print(f"Token hatası: {e}")
            return JSONResponse(content={"status": "error", "reply": "Token alınamadı"}, status_code=500)

        headers = {"Authorization": f"Bearer {token}"}
        response_text = ""

        # --- !yardim ---
        if text.startswith("!yardim"):
            role = await get_user_role(phone)
            if role == "UNREGISTERED":
                response_text = "Sisteme kayıtlı bir numara değilsiniz. Lütfen önce kaydolun."
            else:
                if role == "TECHNICIAN":
                    buttons = [
                        {"type": "reply", "reply": {"id": "btn_islist", "title": "📋 İş Emirlerim"}},
                        {"type": "reply", "reply": {"id": "btn_guncelle", "title": "🔄 Durum Güncelle"}},
                        {"type": "reply", "reply": {"id": "btn_yardim", "title": "❓ Yardım"}}
                    ]
                    body_text = "👋 Hoş geldiniz Teknisyen! Yapmak istediğiniz işlemi seçin:"
                else:
                    buttons = [
                        {"type": "reply", "reply": {"id": "btn_garanti", "title": "🔍 Garanti Sorgula"}},
                        {"type": "reply", "reply": {"id": "btn_durum", "title": "📋 Durum Sorgula"}},
                        {"type": "reply", "reply": {"id": "btn_yardim", "title": "❓ Yardım"}}
                    ]
                    body_text = "👋 Hoş geldiniz Müşteri! Yapmak istediğiniz işlemi seçin:"

                await send_interactive_buttons(phone, body_text, buttons)
                response_text = "Menü gönderildi."

        # --- !isliste ---
        elif text.startswith("!isliste"):
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

        # --- !guncelle ---
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

        # --- !garanti ---
        elif text.startswith("!garanti"):
            parts = text.split()
            if len(parts) >= 2:
                serial = parts[1]
                with httpx.Client() as client:
                    try:
                        resp = client.get(
                            f"{BACKEND_URL}/api/warranty/device/{serial}?phone={phone}",
                            headers=headers
                        )
                        if resp.status_code == 200:
                            data = resp.json()
                            is_under = data.get("isUnderWarranty", False)
                            response_text = f"🔍 **Garanti Sorgulama Sonucu**\n"
                            response_text += f"Seri No: {serial}\n"
                            response_text += f"Garanti Durumu: {'✅ Aktif' if is_under else '❌ Süresi Dolmuş'}\n"
                            if data.get("warrantyRecords"):
                                for w in data["warrantyRecords"]:
                                    response_text += f"- {w['warrantyType']}: {w['startDate']} → {w['endDate']}\n"
                            else:
                                response_text += "Kayıtlı garanti bulunamadı."
                        elif resp.status_code == 404 or resp.status_code == 403:
                            response_text = "❗ Bu cihaza erişim yetkiniz yok veya cihaz bulunamadı."
                        else:
                            response_text = f"❗ Sorgu başarısız (HTTP {resp.status_code})"
                    except Exception as e:
                        response_text = f"❗ Bağlantı hatası: {e}"
            else:
                response_text = "❗ Kullanım: !garanti [SERI_NO]"

        # --- !durum ---
        elif text.startswith("!durum"):
            parts = text.split()
            if len(parts) >= 2:
                work_order_id = parts[1]
                with httpx.Client() as client:
                    try:
                        resp = client.get(
                            f"{BACKEND_URL}/api/workorders/{work_order_id}?phone={phone}",
                            headers=headers
                        )
                        if resp.status_code == 200:
                            wo = resp.json()
                            response_text = f"📋 **İş Emri Durumu**\n"
                            response_text += f"ID: {wo['id']}\n"
                            response_text += f"Durum: {wo['status']}\n"
                            response_text += f"Açıklama: {wo['description']}\n"
                            if wo.get('technician'):
                                response_text += f"Teknisyen: {wo['technician']['user']['fullName']}\n"
                            else:
                                response_text += "Teknisyen: Atanmamış\n"
                        elif resp.status_code == 404:
                            response_text = "❗ Bu iş emrine erişim izniniz yok veya iş emri bulunamadı."
                        else:
                            response_text = f"❗ İş emri bulunamadı (HTTP {resp.status_code})"
                    except Exception as e:
                        response_text = f"❗ Bağlantı hatası: {e}"
            else:
                response_text = "❗ Kullanım: !durum [IS_EMRI_ID]"

        # --- Komut değilse ---
        else:
            role = await get_user_role(phone)
            if role == "UNREGISTERED":
                response_text = "Sisteme kayıtlı bir numara değilsiniz. Lütfen önce kaydolun."
            else:
                if role == "TECHNICIAN":
                    buttons = [
                        {"type": "reply", "reply": {"id": "btn_islist", "title": "📋 İş Emirlerim"}},
                        {"type": "reply", "reply": {"id": "btn_guncelle", "title": "🔄 Durum Güncelle"}},
                        {"type": "reply", "reply": {"id": "btn_yardim", "title": "❓ Yardım"}}
                    ]
                    body_text = "👋 Hoş geldiniz Teknisyen! Yapmak istediğiniz işlemi seçin:"
                else:
                    buttons = [
                        {"type": "reply", "reply": {"id": "btn_garanti", "title": "🔍 Garanti Sorgula"}},
                        {"type": "reply", "reply": {"id": "btn_durum", "title": "📋 Durum Sorgula"}},
                        {"type": "reply", "reply": {"id": "btn_yardim", "title": "❓ Yardım"}}
                    ]
                    body_text = "👋 Hoş geldiniz Müşteri! Yapmak istediğiniz işlemi seçin:"

                await send_interactive_buttons(phone, body_text, buttons)
                response_text = "Menü gönderildi."

        # Cevap metnini gönder (sadece komutlardan sonra veya kayıtlı değilse)
        if response_text:
            await send_whatsapp_message(phone, response_text)

        return JSONResponse(content={"status": "received", "reply": response_text}, status_code=200)

    except Exception as e:
        print(f"❌ Webhook hatası: {e}")
        return JSONResponse(content={"status": "error"}, status_code=500)

# ---- BİLDİRİM ALMA ENDPOINT'İ (Backend'den istek alır) ----
@app.post("/send-notification")
async def send_notification(request: Request):
    try:
        data = await request.json()
        phone = data.get("phone")
        message = data.get("message")
        if not phone or not message:
            return JSONResponse(content={"status": "missing fields"}, status_code=400)
        success = await send_whatsapp_message(phone, message)
        return JSONResponse(content={"status": "sent" if success else "failed"}, status_code=200)
    except Exception as e:
        print(f"❌ Bildirim hatası: {e}")
        return JSONResponse(content={"status": "error"}, status_code=500)

@app.get("/")
def root():
    return {"message": "Servis Takip WhatsApp Botu Çalışıyor!"}