import os
import hmac
import hashlib
import json
import logging
import re
import time
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

CONVERSATION_TTL_SEC = int(os.getenv("CONVERSATION_TTL_SEC", "300"))
RATE_LIMIT = int(os.getenv("BOT_RATE_LIMIT", "120"))
RATE_LIMIT_WINDOW_SEC = int(os.getenv("BOT_RATE_LIMIT_WINDOW_SEC", "60"))

bot_token = None

OPEN_CUSTOMER_STATUSES = {"OPEN", "ASSIGNED", "WAITING_PARTS", "RESOLVED", "IN_PROGRESS"}
OPEN_TECH_STATUSES = {"ASSIGNED", "WAITING_PARTS", "IN_PROGRESS"}

STATUS_LABELS_TR = {
    "OPEN": "Açık",
    "ASSIGNED": "Teknisyen Atandı",
    "IN_PROGRESS": "İşlemde",
    "WAITING_PARTS": "Parça Bekliyor",
    "RESOLVED": "Çözüldü",
    "CLOSED": "Kapatıldı",
    "CANCELLED": "İptal Edildi",
}

SERVICE_NUMBER_RE = re.compile(r"^SRV-\d{4}-\d{6,}$", re.IGNORECASE)


def work_order_status_label(status):
    if not status:
        return "Belirtilmemiş"
    return STATUS_LABELS_TR.get(str(status).upper(), str(status))


def normalize_service_ref(raw):
    """Servis no veya numeric id referansını temizle."""
    if raw is None:
        return None
    cleaned = str(raw).strip().replace("[", "").replace("]", "").strip()
    if not cleaned:
        return None
    return cleaned.upper() if cleaned.upper().startswith("SRV-") else cleaned


def is_service_number(raw):
    cleaned = normalize_service_ref(raw)
    if not cleaned:
        return False
    return bool(SERVICE_NUMBER_RE.match(cleaned))


def parse_status_command(text):
    """
    Desteklenen girdiler:
    17 | durum 17 | !durum 17 | durum [17] | !durum [17]
    SRV-2026-000017 | durum SRV-... | !durum SRV-...
    Dönüş: (ref|None, is_list_only)
    """
    if not text:
        return None, False
    raw = text.strip()
    lowered = raw.lower()
    # !durum / durum önekini kaldır
    for prefix in ("!durum", "durum"):
        if lowered == prefix or lowered.startswith(prefix + " "):
            rest = raw[len(prefix):].strip()
            if not rest:
                return None, True
            return normalize_service_ref(rest), False
    # yalnız servis no veya yalnız numeric
    candidate = normalize_service_ref(raw)
    if candidate and (is_service_number(candidate) or candidate.isdigit()):
        return candidate, False
    return None, False


def friendly_not_found_message():
    return (
        "Servis kaydı bulunamadı. Servis numaranızı şu biçimde yazın:\n"
        "durum SRV-2026-000017"
    )


def format_device_label(wo):
    device = wo.get("device") or {}
    model = device.get("model") or {}
    brand = (model.get("brand") or {}).get("name")
    model_name = model.get("name")
    parts = [p for p in (brand, model_name) if p]
    if parts:
        return " ".join(parts)
    serial = device.get("serialNumber")
    return serial if serial else "Belirtilmemiş"


def format_description(wo):
    desc = wo.get("description")
    if desc is None:
        return "Belirtilmemiş"
    cleaned = str(desc).strip()
    if not cleaned or cleaned == ".":
        return "Belirtilmemiş"
    return cleaned


def format_work_order_detail(wo):
    lines = ["🔧 Servis Kaydı"]
    service_no = wo.get("serviceNumber") or "Belirtilmemiş"
    lines.append(f"Servis No: {service_no}")
    lines.append(f"Durum: {work_order_status_label(wo.get('status'))}")
    lines.append(f"Cihaz: {format_device_label(wo)}")
    lines.append(f"Açıklama: {format_description(wo)}")
    tech = wo.get("technician") or {}
    user = tech.get("user") or {}
    if user.get("fullName"):
        lines.append(f"Teknisyen: {user['fullName']}")
    else:
        lines.append("Teknisyen: Henüz atanmadı")
    return "\n".join(lines)


class ConversationStateStore:
    """Conversation state abstraction — Redis implementation later."""

    def get(self, phone):
        raise NotImplementedError

    def set(self, phone, state, **data):
        raise NotImplementedError

    def clear(self, phone):
        raise NotImplementedError


class InMemoryConversationStateStore(ConversationStateStore):
    def __init__(self, ttl_sec=300):
        self._ttl = ttl_sec
        self._data = {}

    def _key(self, phone):
        return normalize_phone(phone) or phone

    def _purge(self):
        now = time.time()
        expired = [k for k, v in self._data.items() if v.get("expires", 0) < now]
        for k in expired:
            self._data.pop(k, None)

    def get(self, phone):
        self._purge()
        return self._data.get(self._key(phone))

    def set(self, phone, state, **data):
        payload = {"state": state, "expires": time.time() + self._ttl}
        payload.update(data)
        self._data[self._key(phone)] = payload

    def clear(self, phone):
        self._data.pop(self._key(phone), None)


conversation_store = InMemoryConversationStateStore(CONVERSATION_TTL_SEC)


class InMemoryRateLimiter:
    def __init__(self):
        self._windows = {}

    def allow(self, key, limit, window_sec):
        now = time.time()
        q = self._windows.setdefault(key, [])
        cutoff = now - window_sec
        self._windows[key] = [t for t in q if t >= cutoff]
        if len(self._windows[key]) >= limit:
            return False
        self._windows[key].append(now)
        return True


rate_limiter = InMemoryRateLimiter()


def normalize_phone(raw):
    """Canonical TR format: 90XXXXXXXXXX (Java PhoneNormalizer ile uyumlu)."""
    if raw is None:
        return None
    text = str(raw).strip()
    if not text:
        return None
    for ch in (" ", "-", "(", ")", "."):
        text = text.replace(ch, "")
    if text.startswith("+"):
        text = text[1:]
    digits = "".join(c for c in text if c.isdigit())
    if not digits:
        return None
    if digits.startswith("90") and len(digits) >= 12:
        national = digits[2:]
    elif digits.startswith("0") and len(digits) >= 11:
        national = digits[1:]
    else:
        national = digits
    if len(national) > 10:
        national = national[-10:]
    if len(national) != 10:
        return None
    return "90" + national


def mask_phone(phone):
    if not phone:
        return "***"
    digits = "".join(c for c in str(phone) if c.isdigit())
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


def check_rate_limit(request: Request, bucket: str):
    api_key = request.headers.get("X-Bot-Api-Key") or ""
    client = request.client.host if request.client else "unknown"
    key = f"{bucket}:key:{hash(api_key)}" if api_key else f"{bucket}:ip:{client}"
    if not rate_limiter.allow(key, RATE_LIMIT, RATE_LIMIT_WINDOW_SEC):
        return JSONResponse(content={"status": "rate_limited"}, status_code=429)
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


def get_conversation(phone):
    return conversation_store.get(phone)


def set_conversation(phone, state, **data):
    conversation_store.set(phone, state, **data)


def clear_conversation(phone):
    conversation_store.clear(phone)


def warranty_status_label(status):
    if not status:
        return "Garanti durumu belirlenemedi."
    key = str(status).upper()
    mapping = {
        "AKTIF": "Garanti devam ediyor.",
        "ACTIVE": "Garanti devam ediyor.",
        "SURESI_DOLMUS": "Garanti süresi dolmuş.",
        "EXPIRED": "Garanti süresi dolmuş.",
        "TARIH_EKSIK": "Garanti hesabı için satın alma veya kurulum tarihi eksik.",
        "TANIMLANMAMIS": "Bu cihaz için garanti tanımı bulunamadı.",
        "UNKNOWN": "Garanti durumu belirlenemedi.",
    }
    return mapping.get(key, "Garanti durumu belirlenemedi.")


def format_warranty_reply(data, serial):
    lines = ["Garanti Sorgulama Sonucu"]
    lines.append(f"Seri No: {data.get('serialNumber') or serial}")
    if data.get("customerName"):
        lines.append(f"Müşteri: {data['customerName']}")
    brand = data.get("brand")
    model = data.get("model") or data.get("deviceName")
    if brand or model:
        device_line = " ".join(p for p in (brand, model) if p)
        lines.append(f"Cihaz: {device_line}")
    lines.append(f"Durum: {warranty_status_label(data.get('warrantyStatus'))}")
    start = data.get("warrantyStart") or data.get("startDate")
    end = data.get("warrantyEnd") or data.get("endDate")
    if start:
        lines.append(f"Başlangıç: {start}")
    if end:
        lines.append(f"Bitiş: {end}")
    return "\n".join(lines)


async def claim_inbound_message(message_id, phone, message_type, command_summary):
    if not message_id or not WHATSAPP_BOT_API_KEY:
        return True
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{BACKEND_URL}/api/bot/inbound-claim",
                headers=bot_headers(),
                json={
                    "externalMessageId": message_id,
                    "phone": normalize_phone(phone) or phone,
                    "messageType": message_type or "text",
                    "command": (command_summary or "")[:100],
                    "direction": "INBOUND",
                    "status": "RECEIVED",
                },
            )
            if resp.status_code == 200:
                body = resp.json()
                if body.get("duplicate"):
                    log.info("Duplicate Meta message atlandı: id=%s", message_id)
                    return False
            return True
    except Exception as e:
        log.warning("Inbound claim başarısız: %s", type(e).__name__)
        return True


async def log_bot_interaction(**payload):
    if not WHATSAPP_BOT_API_KEY:
        return
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(
                f"{BACKEND_URL}/api/bot/interactions",
                headers=bot_headers(),
                json=payload,
            )
    except Exception:
        pass


async def get_user_role(phone: str):
    try:
        token = get_token()
    except Exception:
        log.warning("Rol tespiti için token alınamadı")
        return "UNREGISTERED"

    phone_q = normalize_phone(phone) or phone
    headers = bot_headers({"Authorization": f"Bearer {token}"})
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{BACKEND_URL}/api/technicians/by-whatsapp/{phone_q}",
            headers=headers,
        )
        if resp.status_code == 200:
            return "TECHNICIAN"
        resp = await client.get(
            f"{BACKEND_URL}/api/customers/by-whatsapp/{phone_q}",
            headers=headers,
        )
        if resp.status_code == 200:
            return "CUSTOMER"
        return "UNREGISTERED"


async def send_whatsapp_message(to_number: str, message: str) -> bool:
    if not WHATSAPP_PHONE_NUMBER_ID or not WHATSAPP_ACCESS_TOKEN:
        log.warning("WhatsApp API bilgileri eksik (PHONE_NUMBER_ID / ACCESS_TOKEN)")
        return False
    to_norm = normalize_phone(to_number) or to_number
    url = f"https://graph.facebook.com/v25.0/{WHATSAPP_PHONE_NUMBER_ID}/messages"
    headers = {
        "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }
    data = {
        "messaging_product": "whatsapp",
        "to": to_norm,
        "type": "text",
        "text": {"body": message},
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, json=data, headers=headers)
            log.info("WhatsApp API yanıtı: status=%s phone=%s", resp.status_code, mask_phone(to_norm))
            return resp.status_code == 200
    except Exception as e:
        log.warning("WhatsApp gönderim hatası: %s", type(e).__name__)
        return False


async def send_interactive_buttons(to_number: str, body_text: str, buttons: list) -> bool:
    if not WHATSAPP_PHONE_NUMBER_ID or not WHATSAPP_ACCESS_TOKEN:
        log.warning("WhatsApp API bilgileri eksik")
        return False
    to_norm = normalize_phone(to_number) or to_number
    url = f"https://graph.facebook.com/v25.0/{WHATSAPP_PHONE_NUMBER_ID}/messages"
    headers = {
        "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }
    data = {
        "messaging_product": "whatsapp",
        "to": to_norm,
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
            log.info("Butonlu mesaj API yanıtı: status=%s phone=%s", resp.status_code, mask_phone(to_norm))
            return resp.status_code == 200
    except Exception as e:
        log.warning("Butonlu mesaj hatası: %s", type(e).__name__)
        return False


def _auth_headers():
    token = get_token()
    return bot_headers({"Authorization": f"Bearer {token}"})


def _get_with_auth(url, params=None):
    headers = _auth_headers()
    with httpx.Client(timeout=10.0) as client:
        resp = client.get(url, headers=headers, params=params)
        if resp.status_code == 401:
            token = get_token(force_refresh=True)
            headers = bot_headers({"Authorization": f"Bearer {token}"})
            resp = client.get(url, headers=headers, params=params)
        return resp


def _put_with_auth(url, params=None):
    headers = _auth_headers()
    with httpx.Client(timeout=10.0) as client:
        resp = client.put(url, headers=headers, params=params)
        if resp.status_code == 401:
            token = get_token(force_refresh=True)
            headers = bot_headers({"Authorization": f"Bearer {token}"})
            resp = client.put(url, headers=headers, params=params)
        return resp


def handle_customer_status_list(phone):
    phone_q = normalize_phone(phone) or phone
    try:
        resp = _get_with_auth(
            f"{BACKEND_URL}/api/workorders",
            params={"page": 0, "size": 20, "customerWhatsapp": phone_q},
        )
        if resp.status_code != 200:
            return "Servis kayıtlarınız şu an alınamadı. Lütfen daha sonra tekrar deneyin."
        orders = resp.json().get("content", [])
        open_orders = [o for o in orders if o.get("status") in OPEN_CUSTOMER_STATUSES]
        if not open_orders:
            return "Açık servis kaydınız bulunmuyor."
        if len(open_orders) == 1:
            return format_work_order_detail(open_orders[0])
        lines = ["Açık servis kayıtlarınız:"]
        for idx, o in enumerate(open_orders[:8], start=1):
            sn = o.get("serviceNumber") or f"#{o.get('id')}"
            lines.append(f"{idx}. {sn} — {work_order_status_label(o.get('status'))}")
        lines.append("")
        lines.append("Detay için:")
        example = open_orders[0].get("serviceNumber") or "SRV-2026-000017"
        lines.append(f"durum {example}")
        set_conversation(
            phone,
            "AWAIT_STATUS_PICK",
            orders=[o.get("serviceNumber") or str(o["id"]) for o in open_orders[:8]],
        )
        return "\n".join(lines)
    except Exception:
        return "Servis kayıtlarınız şu an alınamadı. Lütfen daha sonra tekrar deneyin."


def handle_status_lookup(phone, ref):
    """ref: service number veya numeric id (geriye uyumluluk)."""
    phone_q = normalize_phone(phone) or phone
    cleaned = normalize_service_ref(ref)
    if not cleaned:
        return friendly_not_found_message()
    try:
        if is_service_number(cleaned):
            resp = _get_with_auth(
                f"{BACKEND_URL}/api/workorders/by-service-number/{cleaned}",
                params={"phone": phone_q},
            )
        elif cleaned.isdigit():
            resp = _get_with_auth(
                f"{BACKEND_URL}/api/workorders/{cleaned}",
                params={"phone": phone_q},
            )
        else:
            return friendly_not_found_message()

        if resp.status_code == 200:
            return format_work_order_detail(resp.json())
        return friendly_not_found_message()
    except Exception:
        return friendly_not_found_message()


def handle_status_by_id(phone, work_order_id):
    """Geriye uyumluluk sarmalayıcısı."""
    return handle_status_lookup(phone, work_order_id)

def handle_warranty_query(phone, serial):
    phone_q = normalize_phone(phone) or phone
    try:
        resp = _get_with_auth(
            f"{BACKEND_URL}/api/warranty/device/{serial}",
            params={"phone": phone_q},
        )
        if resp.status_code == 200:
            return format_warranty_reply(resp.json(), serial)
        if resp.status_code in (404, 403):
            return "Bu seri numarasıyla cihaz bulunamadı."
        return f"Sorgu başarısız (HTTP {resp.status_code})"
    except Exception as e:
        return f"Bağlantı hatası: {type(e).__name__}"


def handle_tech_list(phone):
    phone_q = normalize_phone(phone) or phone
    try:
        resp = _get_with_auth(
            f"{BACKEND_URL}/api/workorders",
            params={"page": 0, "size": 10, "technicianWhatsapp": phone_q},
        )
        if resp.status_code != 200:
            return f"Backend'den veri alınamadı (HTTP {resp.status_code})"
        orders = resp.json().get("content", [])
        if not orders:
            return "Size atanmış iş emri bulunmuyor."
        lines = ["İş Emirleriniz:"]
        for o in orders[:5]:
            desc = (o.get("description") or "")[:20]
            lines.append(f"ID: {o['id']} - {o['status']} - {desc}...")
        return "\n".join(lines)
    except Exception as e:
        return f"Bağlantı hatası: {type(e).__name__}"


def handle_tech_update_prompt(phone):
    phone_q = normalize_phone(phone) or phone
    try:
        resp = _get_with_auth(
            f"{BACKEND_URL}/api/workorders",
            params={"page": 0, "size": 20, "technicianWhatsapp": phone_q},
        )
        if resp.status_code != 200:
            return f"Backend'den veri alınamadı (HTTP {resp.status_code})"
        orders = [
            o for o in resp.json().get("content", [])
            if o.get("status") in OPEN_TECH_STATUSES
        ]
        if not orders:
            return "Güncellenebilir açık iş emriniz yok."
        lines = ["Atanmış açık iş emirleriniz:"]
        for o in orders[:8]:
            desc = (o.get("description") or "")[:25]
            lines.append(f"ID {o['id']} — {o.get('status')} — {desc}")
        lines.append("Güncellemek için: !guncelle [ID] [DURUM]")
        lines.append("Örnek: !guncelle 12 IN_PROGRESS")
        lines.append("Durumlar: IN_PROGRESS, WAITING_PARTS, RESOLVED, CANCELLED")
        set_conversation(phone, "AWAIT_TECH_UPDATE")
        return "\n".join(lines)
    except Exception as e:
        return f"Bağlantı hatası: {type(e).__name__}"


def handle_tech_update(phone, work_order_id, new_status):
    phone_q = normalize_phone(phone) or phone
    try:
        resp = _put_with_auth(
            f"{BACKEND_URL}/api/workorders/{work_order_id}/status",
            params={
                "status": new_status,
                "channel": "WHATSAPP",
                "technicianWhatsapp": phone_q,
            },
        )
        if resp.status_code == 200:
            clear_conversation(phone)
            return f"İş emri {work_order_id} durumu {new_status} olarak güncellendi."
        if resp.status_code in (403, 404):
            return "Bu iş emrini güncelleyemezsiniz veya bulunamadı."
        return f"Güncellenemedi. Hata: {resp.status_code}"
    except Exception as e:
        return f"Bağlantı hatası: {type(e).__name__}"


def welcome_menu(role):
    if role == "TECHNICIAN":
        buttons = [
            {"type": "reply", "reply": {"id": "btn_islist", "title": "İş Emirlerim"}},
            {"type": "reply", "reply": {"id": "btn_guncelle", "title": "Durum Güncelle"}},
            {"type": "reply", "reply": {"id": "btn_yardim", "title": "Yardım"}},
        ]
        body_text = "Hoş geldiniz. Yapmak istediğiniz işlemi seçin:"
    else:
        buttons = [
            {"type": "reply", "reply": {"id": "btn_garanti", "title": "Garanti Sorgula"}},
            {"type": "reply", "reply": {"id": "btn_durum", "title": "Servis Durumu"}},
            {"type": "reply", "reply": {"id": "btn_yardim", "title": "Yardım"}},
        ]
        body_text = "Hoş geldiniz. Yapmak istediğiniz işlemi seçin:"
    return body_text, buttons


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
    limited = check_rate_limit(request, "webhook")
    if limited:
        return limited
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
        phone = normalize_phone(msg.get("from")) or msg.get("from")
        message_id = msg.get("id")
        msg_type = msg.get("type")
        text = None
        command_summary = None

        if msg_type == "text":
            text = msg["text"]["body"].strip()
            command_summary = text.split()[0][:40] if text else None
            log.info("Mesaj alındı: type=text phone=%s", mask_phone(phone))
        elif msg_type == "interactive":
            interactive = msg["interactive"]
            if interactive["type"] == "button_reply":
                button_id = interactive["button_reply"]["id"]
                command_summary = button_id
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

        if not await claim_inbound_message(message_id, phone, msg_type, command_summary):
            return JSONResponse(content={"status": "duplicate"}, status_code=200)

        if not text:
            return JSONResponse(content={"status": "ignored"}, status_code=200)

        try:
            get_token()
        except Exception:
            try:
                get_token(force_refresh=True)
            except Exception:
                return JSONResponse(content={"status": "error", "reply": "Token alınamadı"}, status_code=500)

        response_text = ""
        conv = get_conversation(phone)

        # Conversation state: garanti seri numarası bekleniyor
        if conv and conv.get("state") == "AWAIT_SERIAL" and not text.startswith("!"):
            serial = text.strip()
            clear_conversation(phone)
            response_text = handle_warranty_query(phone, serial)

        # Conversation: durum seçimi (liste sırası veya servis no)
        elif conv and conv.get("state") == "AWAIT_STATUS_PICK" and not text.startswith("!"):
            pick = text.strip()
            order_refs = conv.get("orders") or []
            if pick.isdigit():
                idx = int(pick)
                if 1 <= idx <= len(order_refs):
                    clear_conversation(phone)
                    response_text = handle_status_lookup(phone, order_refs[idx - 1])
                else:
                    response_text = (
                        "Geçersiz seçim. Listeden bir numara seçin veya "
                        "durum SRV-2026-000017 yazın."
                    )
            elif is_service_number(pick) or pick.upper().startswith("DURUM"):
                clear_conversation(phone)
                ref, list_only = parse_status_command(pick if pick.lower().startswith("durum") else f"durum {pick}")
                if list_only or not ref:
                    response_text = handle_customer_status_list(phone)
                else:
                    response_text = handle_status_lookup(phone, ref)
            else:
                response_text = (
                    "Geçersiz seçim. Listeden bir numara seçin veya "
                    "durum SRV-2026-000017 yazın."
                )

        # Conversation: teknisyen güncelleme devamı
        elif conv and conv.get("state") == "AWAIT_TECH_UPDATE" and not text.startswith("!"):
            parts = text.split()
            if len(parts) >= 2 and parts[0].isdigit():
                response_text = handle_tech_update(phone, parts[0], parts[1].upper())
            else:
                response_text = "Format: [ID] [DURUM]  örn: 12 WAITING_PARTS"

        elif text.startswith("!yardim"):
            role = await get_user_role(phone)
            if role == "UNREGISTERED":
                response_text = "Sisteme kayıtlı bir numara değilsiniz. Lütfen önce kaydolun."
            else:
                body_text, buttons = welcome_menu(role)
                await send_interactive_buttons(phone, body_text, buttons)
                response_text = "Menü gönderildi."

        elif text.startswith("!isliste"):
            response_text = handle_tech_list(phone)

        elif text.startswith("!guncelle"):
            parts = text.split()
            if len(parts) >= 3:
                response_text = handle_tech_update(phone, parts[1], parts[2].upper())
            else:
                response_text = handle_tech_update_prompt(phone)

        elif text.startswith("!garanti"):
            parts = text.split()
            if len(parts) >= 2:
                clear_conversation(phone)
                response_text = handle_warranty_query(phone, parts[1])
            else:
                set_conversation(phone, "AWAIT_SERIAL")
                response_text = "Lütfen cihaz seri numarasını yazın."

        elif text.lower().startswith("!durum") or text.lower().startswith("durum"):
            ref, list_only = parse_status_command(text)
            clear_conversation(phone)
            if list_only or not ref:
                response_text = handle_customer_status_list(phone)
            else:
                response_text = handle_status_lookup(phone, ref)

        else:
            # Liste dışı: yalnız sayı veya SRV-... → durum sorgusu
            bare_ref, _ = parse_status_command(text)
            if bare_ref and (is_service_number(bare_ref) or bare_ref.isdigit()):
                clear_conversation(phone)
                response_text = handle_status_lookup(phone, bare_ref)
            else:
                role = await get_user_role(phone)
                if role == "UNREGISTERED":
                    response_text = "Sisteme kayıtlı bir numara değilsiniz. Lütfen önce kaydolun."
                else:
                    body_text, buttons = welcome_menu(role)
                    await send_interactive_buttons(phone, body_text, buttons)
                    response_text = "Menü gönderildi."

        if response_text:
            await send_whatsapp_message(phone, response_text)
            await log_bot_interaction(
                direction="OUTBOUND",
                phone=phone,
                messageType="text",
                command=command_summary,
                status="SENT",
                messageSummary=(response_text or "")[:120],
            )

        return JSONResponse(content={"status": "received"}, status_code=200)

    except Exception as e:
        log.warning("Webhook işleme hatası: %s", type(e).__name__)
        return JSONResponse(content={"status": "error"}, status_code=500)


@app.post("/send-notification")
async def send_notification(request: Request):
    auth_error = require_api_key(request)
    if auth_error:
        return auth_error
    limited = check_rate_limit(request, "send")
    if limited:
        return limited
    try:
        data = await request.json()
        phone = data.get("phone")
        message = data.get("message")
        if not phone or not message:
            return JSONResponse(content={"status": "missing fields"}, status_code=400)
        phone_norm = normalize_phone(phone) or phone
        success = await send_whatsapp_message(phone_norm, message)
        return JSONResponse(content={"status": "sent" if success else "failed"}, status_code=200)
    except Exception as e:
        log.warning("Bildirim hatası: %s", type(e).__name__)
        return JSONResponse(content={"status": "error"}, status_code=500)


@app.get("/health")
async def health(request: Request):
    """Private/ops health — API key ile korunabilir."""
    if WHATSAPP_BOT_API_KEY:
        auth_error = require_api_key(request)
        if auth_error:
            return auth_error
    return {
        "status": "ok",
        "botConfigured": bool(WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN),
        "backendConfigured": bool(BACKEND_URL),
    }


@app.get("/")
def root():
    return {"message": "Servis Takip WhatsApp Botu Çalışıyor!"}
