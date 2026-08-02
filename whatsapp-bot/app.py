import os
import hmac
import hashlib
import json
import logging
import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, PlainTextResponse

load_dotenv()

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("whatsapp-bot")

app = FastAPI()

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8080").rstrip("/")
WHATSAPP_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID")
WHATSAPP_ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN")
WHATSAPP_VERIFY_TOKEN = os.getenv("WHATSAPP_VERIFY_TOKEN")
WHATSAPP_APP_SECRET = os.getenv("WHATSAPP_APP_SECRET")
WHATSAPP_BOT_API_KEY = os.getenv("WHATSAPP_BOT_API_KEY")
BOT_EMAIL = os.getenv("BOT_EMAIL")
BOT_PASSWORD = os.getenv("BOT_PASSWORD")

bot_token = None


def mask_phone(phone):
    if not phone:
        return "***"
    digits = "".join(c for c in phone if c.isdigit())
    if len(digits) <= 6:
        return "***"
    return f"{digits[:3]}******{digits[-3:]}"


def bot_headers(extra=None):
    headers = {}
    if WHATSAPP_BOT_API_KEY:
        headers["X-Bot-Api-Key"] = WHATSAPP_BOT_API_KEY
    if extra:
        headers.update(extra)
    return headers


def require_bot_credentials():
    if not BOT_EMAIL or not BOT_PASSWORD:
        raise RuntimeError("BOT_EMAIL / BOT_PASSWORD ortam değişkenleri zorunludur")


def get_token(force_refresh=False):
    global bot_token
    require_bot_credentials()
    if bot_token and not force_refresh:
        return bot_token
    with httpx.Client(timeout=10.0) as client:
        resp = client.post(
            f"{BACKEND_URL}/auth/login",
            json={"email": BOT_EMAIL, "password": BOT_PASSWORD},
        )
        if resp.status_code == 200:
            bot_token = resp.json().get("token")
            if not bot_token:
                raise RuntimeError("Backend login yanıtında token yok")
            return bot_token
        bot_token = None
        raise RuntimeError(f"Backend token alınamadı (HTTP {resp.status_code})")


def require_api_key(request: Request):
    if not WHATSAPP_BOT_API_KEY:
        log.error("WHATSAPP_BOT_API_KEY tanımlı değil; /send-notification kapalı")
        return JSONResponse(content={"status": "misconfigured"}, status_code=503)
    provided = request.headers.get("X-Bot-Api-Key")
    if not provided or not hmac.compare_digest(provided, WHATSAPP_BOT_API_KEY):
        return JSONResponse(content={"status": "unauthorized"}, status_code=401)
    return None


def verify_meta_signature(raw_body: bytes, signature_header):
    if not WHATSAPP_APP_SECRET:
        log.error("WHATSAPP_APP_SECRET tanımlı değil; webhook reddedildi")
        return False
    if not signature_header or not signature_header.startswith("sha256="):
        return False
    expected = signature_header.split("=", 1)[1].strip()
    digest = hmac.new(
        WHATSAPP_APP_SECRET.encode("utf-8"),
        raw_body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(digest, expected)


async def get_user_role(phone: str):
    """WhatsApp numarasına göre kullanıcı rolünü döndürür: TECHNICIAN, CUSTOMER, UNREGISTERED"""
    try:
        token = get_token()
    except Exception:
        log.warning("Rol tespiti için token alınamadı")
        return "UNREGISTERED"

    headers = bot_headers({"Authorization": f"Bearer {token}"})
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{BACKEND_URL}/api/technicians/by-whatsapp/{phone}",
            headers=headers,
        )
        if resp.status_code == 200:
            return "TECHNICIAN"
        resp = await client.get(
            f"{BACKEND_URL}/api/customers/by-whatsapp/{phone}",
            headers=headers,
        )
        if resp.status_code == 200:
            return "CUSTOMER"
        return "UNREGISTERED"


async def send_whatsapp_message(to_number: str, message: str) -> bool:
    if not WHATSAPP_PHONE_NUMBER_ID or not WHATSAPP_ACCESS_TOKEN:
        log.warning("WhatsApp API bilgileri eksik (PHONE_NUMBER_ID / ACCESS_TOKEN)")
        return False
    url = f"https://graph.facebook.com/v25.0/{WHATSAPP_PHONE_NUMBER_ID}/messages"
    headers = {
        "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }
    data = {
        "messaging_product": "whatsapp",
        "to": to_number,
        "type": "text",
        "text": {"body": message},
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, json=data, headers=headers)
            log.info("WhatsApp API yanıtı: status=%s phone=%s", resp.status_code, mask_phone(to_number))
            return resp.status_code == 200
    except Exception as e:
        log.warning("WhatsApp gönderim hatası: %s", type(e).__name__)
        return False


async def send_interactive_buttons(to_number: str, body_text: str, buttons: list) -> bool:
    if not WHATSAPP_PHONE_NUMBER_ID or not WHATSAPP_ACCESS_TOKEN:
        log.warning("WhatsApp API bilgileri eksik")
        return False
    url = f"https://graph.facebook.com/v25.0/{WHATSAPP_PHONE_NUMBER_ID}/messages"
    headers = {
        "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }
    data = {
        "messaging_product": "whatsapp",
        "to": to_number,
        "type": "interactive",
        "interactive": {
            "type": "button",
            "body": {"text": body_text},
            "action": {"buttons": buttons},
        },
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, json=data, headers=headers)
            log.info("Butonlu mesaj API yanıtı: status=%s phone=%s", resp.status_code, mask_phone(to_number))
            return resp.status_code == 200
    except Exception as e:
        log.warning("Butonlu mesaj hatası: %s", type(e).__name__)
        return False


@app.get("/webhook")
async def verify_webhook(request: Request):
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")
    log.info("GET /webhook doğrulama: mode=%s", mode)
    if not WHATSAPP_VERIFY_TOKEN:
        log.error("WHATSAPP_VERIFY_TOKEN tanımlı değil")
        return JSONResponse(content={"status": "error"}, status_code=403)
    if mode == "subscribe" and token and hmac.compare_digest(token, WHATSAPP_VERIFY_TOKEN):
        return PlainTextResponse(content=str(challenge), status_code=200)
    return JSONResponse(content={"status": "error"}, status_code=403)


@app.post("/webhook")
async def webhook(request: Request):
    raw_body = await request.body()
    signature = request.headers.get("X-Hub-Signature-256")
    if not verify_meta_signature(raw_body, signature):
        log.warning("Webhook imza doğrulaması başarısız")
        return JSONResponse(content={"status": "unauthorized"}, status_code=401)

    try:
        data = json.loads(raw_body.decode("utf-8"))
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
            log.info("Mesaj alındı: type=text phone=%s", mask_phone(phone))
        elif msg_type == "interactive":
            interactive = msg["interactive"]
            if interactive["type"] == "button_reply":
                button_id = interactive["button_reply"]["id"]
                log.info("Buton tıklandı: id=%s phone=%s", button_id, mask_phone(phone))
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
            log.warning("Token hatası: %s", type(e).__name__)
            # Bir kez yenilemeyi dene
            try:
                token = get_token(force_refresh=True)
            except Exception:
                return JSONResponse(content={"status": "error", "reply": "Token alınamadı"}, status_code=500)

        headers = bot_headers({"Authorization": f"Bearer {token}"})
        response_text = ""

        if text.startswith("!yardim"):
            role = await get_user_role(phone)
            if role == "UNREGISTERED":
                response_text = "Sisteme kayıtlı bir numara değilsiniz. Lütfen önce kaydolun."
            else:
                if role == "TECHNICIAN":
                    buttons = [
                        {"type": "reply", "reply": {"id": "btn_islist", "title": "📋 İş Emirlerim"}},
                        {"type": "reply", "reply": {"id": "btn_guncelle", "title": "🔄 Durum Güncelle"}},
                        {"type": "reply", "reply": {"id": "btn_yardim", "title": "❓ Yardım"}},
                    ]
                    body_text = "👋 Hoş geldiniz Teknisyen! Yapmak istediğiniz işlemi seçin:"
                else:
                    buttons = [
                        {"type": "reply", "reply": {"id": "btn_garanti", "title": "🔍 Garanti Sorgula"}},
                        {"type": "reply", "reply": {"id": "btn_durum", "title": "📋 Durum Sorgula"}},
                        {"type": "reply", "reply": {"id": "btn_yardim", "title": "❓ Yardım"}},
                    ]
                    body_text = "👋 Hoş geldiniz Müşteri! Yapmak istediğiniz işlemi seçin:"

                await send_interactive_buttons(phone, body_text, buttons)
                response_text = "Menü gönderildi."

        elif text.startswith("!isliste"):
            with httpx.Client(timeout=10.0) as client:
                try:
                    resp = client.get(
                        f"{BACKEND_URL}/api/workorders?page=0&size=10&technicianWhatsapp={phone}",
                        headers=headers,
                    )
                    if resp.status_code == 401:
                        token = get_token(force_refresh=True)
                        headers = bot_headers({"Authorization": f"Bearer {token}"})
                        resp = client.get(
                            f"{BACKEND_URL}/api/workorders?page=0&size=10&technicianWhatsapp={phone}",
                            headers=headers,
                        )
                    if resp.status_code == 200:
                        orders = resp.json().get("content", [])
                        if orders:
                            lines = ["📋 İş Emirleriniz:"]
                            for o in orders[:5]:
                                desc = (o.get("description") or "")[:20]
                                lines.append(f"ID: {o['id']} - {o['status']} - {desc}...")
                            response_text = "\n".join(lines)
                        else:
                            response_text = "📭 Size atanmış iş emri bulunmuyor."
                    else:
                        response_text = f"❗ Backend'den veri alınamadı (HTTP {resp.status_code})"
                except Exception as e:
                    response_text = f"❗ Bağlantı hatası: {type(e).__name__}"

        elif text.startswith("!guncelle"):
            parts = text.split()
            if len(parts) >= 3:
                work_order_id = parts[1]
                new_status = parts[2].upper()
                with httpx.Client(timeout=10.0) as client:
                    try:
                        resp = client.put(
                            f"{BACKEND_URL}/api/workorders/{work_order_id}/status",
                            params={"status": new_status, "channel": "WHATSAPP"},
                            headers=headers,
                        )
                        if resp.status_code == 200:
                            response_text = f"✅ İş emri {work_order_id} durumu {new_status} olarak güncellendi."
                        else:
                            response_text = f"❗ Güncellenemedi. Hata: {resp.status_code}"
                    except Exception as e:
                        response_text = f"❗ Bağlantı hatası: {type(e).__name__}"
            else:
                response_text = "❗ Yanlış format. Kullanım: !guncelle [ID] [DURUM]"

        elif text.startswith("!garanti"):
            parts = text.split()
            if len(parts) >= 2:
                serial = parts[1]
                with httpx.Client(timeout=10.0) as client:
                    try:
                        resp = client.get(
                            f"{BACKEND_URL}/api/warranty/device/{serial}?phone={phone}",
                            headers=headers,
                        )
                        if resp.status_code == 200:
                            data = resp.json()
                            is_under = data.get("isUnderWarranty", False)
                            response_text = "🔍 **Garanti Sorgulama Sonucu**\n"
                            response_text += f"Seri No: {serial}\n"
                            response_text += f"Garanti Durumu: {'✅ Aktif' if is_under else '❌ Süresi Dolmuş'}\n"
                            if data.get("warrantyRecords"):
                                for w in data["warrantyRecords"]:
                                    response_text += f"- {w['warrantyType']}: {w['startDate']} → {w['endDate']}\n"
                            else:
                                response_text += "Kayıtlı garanti bulunamadı."
                        elif resp.status_code in (404, 403):
                            response_text = "❗ Bu cihaza erişim yetkiniz yok veya cihaz bulunamadı."
                        else:
                            response_text = f"❗ Sorgu başarısız (HTTP {resp.status_code})"
                    except Exception as e:
                        response_text = f"❗ Bağlantı hatası: {type(e).__name__}"
            else:
                response_text = "❗ Kullanım: !garanti [SERI_NO]"

        elif text.startswith("!durum"):
            parts = text.split()
            if len(parts) >= 2:
                work_order_id = parts[1]
                with httpx.Client(timeout=10.0) as client:
                    try:
                        resp = client.get(
                            f"{BACKEND_URL}/api/workorders/{work_order_id}?phone={phone}",
                            headers=headers,
                        )
                        if resp.status_code == 200:
                            wo = resp.json()
                            response_text = "📋 **İş Emri Durumu**\n"
                            response_text += f"ID: {wo['id']}\n"
                            response_text += f"Durum: {wo['status']}\n"
                            response_text += f"Açıklama: {wo['description']}\n"
                            if wo.get("technician") and wo["technician"].get("user"):
                                response_text += f"Teknisyen: {wo['technician']['user']['fullName']}\n"
                            else:
                                response_text += "Teknisyen: Atanmamış\n"
                        elif resp.status_code == 404:
                            response_text = "❗ Bu iş emrine erişim izniniz yok veya iş emri bulunamadı."
                        else:
                            response_text = f"❗ İş emri bulunamadı (HTTP {resp.status_code})"
                    except Exception as e:
                        response_text = f"❗ Bağlantı hatası: {type(e).__name__}"
            else:
                response_text = "❗ Kullanım: !durum [IS_EMRI_ID]"

        else:
            role = await get_user_role(phone)
            if role == "UNREGISTERED":
                response_text = "Sisteme kayıtlı bir numara değilsiniz. Lütfen önce kaydolun."
            else:
                if role == "TECHNICIAN":
                    buttons = [
                        {"type": "reply", "reply": {"id": "btn_islist", "title": "📋 İş Emirlerim"}},
                        {"type": "reply", "reply": {"id": "btn_guncelle", "title": "🔄 Durum Güncelle"}},
                        {"type": "reply", "reply": {"id": "btn_yardim", "title": "❓ Yardım"}},
                    ]
                    body_text = "👋 Hoş geldiniz Teknisyen! Yapmak istediğiniz işlemi seçin:"
                else:
                    buttons = [
                        {"type": "reply", "reply": {"id": "btn_garanti", "title": "🔍 Garanti Sorgula"}},
                        {"type": "reply", "reply": {"id": "btn_durum", "title": "📋 Durum Sorgula"}},
                        {"type": "reply", "reply": {"id": "btn_yardim", "title": "❓ Yardım"}},
                    ]
                    body_text = "👋 Hoş geldiniz Müşteri! Yapmak istediğiniz işlemi seçin:"

                await send_interactive_buttons(phone, body_text, buttons)
                response_text = "Menü gönderildi."

        if response_text:
            await send_whatsapp_message(phone, response_text)

        return JSONResponse(content={"status": "received"}, status_code=200)

    except Exception as e:
        log.warning("Webhook işleme hatası: %s", type(e).__name__)
        return JSONResponse(content={"status": "error"}, status_code=500)


@app.post("/send-notification")
async def send_notification(request: Request):
    auth_error = require_api_key(request)
    if auth_error:
        return auth_error
    try:
        data = await request.json()
        phone = data.get("phone")
        message = data.get("message")
        if not phone or not message:
            return JSONResponse(content={"status": "missing fields"}, status_code=400)
        success = await send_whatsapp_message(phone, message)
        return JSONResponse(content={"status": "sent" if success else "failed"}, status_code=200)
    except Exception as e:
        log.warning("Bildirim hatası: %s", type(e).__name__)
        return JSONResponse(content={"status": "error"}, status_code=500)


@app.get("/")
def root():
    return {"message": "Servis Takip WhatsApp Botu Çalışıyor!"}
