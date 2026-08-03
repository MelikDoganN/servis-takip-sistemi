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

OPEN_CUSTOMER_STATUSES = {
    "OPEN",
    "ASSIGNED",
    "WAITING_PARTS",
    "RESOLVED",
    "IN_PROGRESS",
    "READY_FOR_DELIVERY",
}
OPEN_TECH_STATUSES = {"ASSIGNED", "WAITING_PARTS", "IN_PROGRESS"}

STATUS_LABELS_TR = {
    "OPEN": "Açık",
    "ASSIGNED": "Teknisyen Atandı",
    "IN_PROGRESS": "İşlemde",
    "WAITING_PARTS": "Parça Bekliyor",
    "RESOLVED": "Teknik İşlem Tamamlandı",
    "READY_FOR_DELIVERY": "Teslime Hazır",
    "DELIVERED": "Teslim Edildi",
    "CLOSED": "Kapatıldı",
    "CANCELLED": "İptal Edildi",
}

STATUS_LIST_EMOJI = {
    "OPEN": "📌",
    "ASSIGNED": "📌",
    "IN_PROGRESS": "🛠️",
    "WAITING_PARTS": "🟡",
    "RESOLVED": "✅",
    "READY_FOR_DELIVERY": "🎉",
    "DELIVERED": "📦",
    "CLOSED": "✅",
    "CANCELLED": "❌",
}

TECH_COMMAND_STATUS = {
    "başla": "IN_PROGRESS",
    "basla": "IN_PROGRESS",
    "parça": "WAITING_PARTS",
    "parca": "WAITING_PARTS",
    "devam": "IN_PROGRESS",
    "tamamla": "RESOLVED",
}

GREETING_WORDS = {
    "merhaba",
    "selam",
    "menu",
    "menü",
    "yardim",
    "yardım",
    "!yardim",
    "!yardım",
}

MSG_NOT_FOUND = "🔎 Servis kaydı bulunamadı."
MSG_UNKNOWN_COMMAND = (
    "⚠️ İşleminizi anlayamadım. “Yardım” yazarak seçenekleri görebilirsiniz."
)
MSG_SYSTEM_ERROR = (
    "⚠️ İşleminiz şu anda tamamlanamadı. Lütfen daha sonra tekrar deneyin."
)
MSG_FORBIDDEN = "⛔ Bu iş emri size atanmış değil."
MSG_INVALID_TRANSITION = (
    "⚠️ Bu kayıt mevcut durumundan seçtiğiniz duruma geçirilemez."
)

SERVICE_NUMBER_RE = re.compile(r"^SRV-\d{4}-\d{6,}$", re.IGNORECASE)


def work_order_status_label(status):
    if not status:
        return "Belirtilmedi"
    return STATUS_LABELS_TR.get(str(status).upper(), "Belirtilmedi")


def first_name_from_full(full_name):
    if not full_name or not str(full_name).strip():
        return None
    return str(full_name).strip().split()[0]


def display_or_default(value, default="Belirtilmedi"):
    if value is None:
        return default
    cleaned = str(value).strip()
    if not cleaned or cleaned == "." or cleaned.lower() == "null":
        return default
    return cleaned


def format_eta(value):
    if value is None:
        return "Belirtilmedi"
    text = str(value).strip()
    if not text:
        return "Belirtilmedi"
    # ISO: 2026-08-10T14:30:00 -> 10.08.2026 14:30
    try:
        if "T" in text:
            date_part, time_part = text.split("T", 1)
            y, m, d = date_part.split("-")
            hm = time_part[:5]
            return f"{d}.{m}.{y} {hm}"
    except Exception:
        pass
    return text


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
    for prefix in ("!durum", "durum", "servislerim", "!servislerim"):
        if lowered == prefix or lowered.startswith(prefix + " "):
            rest = raw[len(prefix):].strip()
            if not rest:
                return None, True
            return normalize_service_ref(rest), False
    candidate = normalize_service_ref(raw)
    if candidate and (is_service_number(candidate) or candidate.isdigit()):
        return candidate, False
    return None, False


def parse_tech_command(text):
    """
    başla SRV-... | parça 12 | devam SRV-... | tamamla SRV-...
    Dönüş: (command_key, status|None, ref|None) veya (None, None, None)
    """
    if not text:
        return None, None, None
    parts = text.strip().split()
    if not parts:
        return None, None, None
    cmd = parts[0].lower().lstrip("!")
    # Turkish ı/i normalization for matching keys already listed both ways
    status = TECH_COMMAND_STATUS.get(cmd)
    if not status:
        return None, None, None
    if len(parts) < 2:
        return cmd, status, None
    return cmd, status, normalize_service_ref(parts[1])


def is_greeting(text):
    if not text:
        return False
    cleaned = text.strip().lower().rstrip("!.")
    return cleaned in GREETING_WORDS


def friendly_not_found_message():
    return MSG_NOT_FOUND


def format_device_label(wo):
    device = (wo or {}).get("device") or {}
    model = device.get("model") or {}
    brand = (model.get("brand") or {}).get("name")
    model_name = model.get("name")
    parts = [p for p in (brand, model_name) if p and str(p).strip()]
    if parts:
        return " ".join(str(p).strip() for p in parts)
    return "Belirtilmedi"


def format_description(wo):
    return display_or_default((wo or {}).get("description"))


def format_serial(wo):
    device = (wo or {}).get("device") or {}
    return display_or_default(device.get("serialNumber"))


def format_technician_name(wo):
    tech = (wo or {}).get("technician") or {}
    user = tech.get("user") or {}
    name = user.get("fullName")
    if name and str(name).strip():
        return str(name).strip()
    return "Henüz atanmadı"


def format_work_order_detail(wo):
    status = str((wo or {}).get("status") or "").upper()
    lines = [
        "🔧 Servis Kaydı",
        "",
        "🆔 Servis No",
        display_or_default((wo or {}).get("serviceNumber")),
        "",
        "📱 Cihaz",
        format_device_label(wo),
        "",
        "🔢 Seri No",
        format_serial(wo),
        "",
        "📌 Durum",
        work_order_status_label(status),
        "",
        "👨‍🔧 Teknisyen",
        format_technician_name(wo),
        "",
        "📝 Arıza Açıklaması",
        format_description(wo),
        "",
        "📅 Tahmini Tamamlanma",
        format_eta((wo or {}).get("estimatedCompletionAt")),
    ]
    if status == "READY_FOR_DELIVERY":
        lines.extend(["", "✅ Cihazınız teslim alınmaya hazırdır."])
    elif status == "DELIVERED":
        lines.extend(["", "📦 Cihazınız teslim edilmiştir."])
    elif status == "CANCELLED":
        reason = display_or_default((wo or {}).get("cancellationReason"))
        lines.extend(["", "❌ Servis kaydınız iptal edilmiştir.", f"Sebep: {reason}"])
    return "\n".join(lines)


def format_customer_service_list(orders):
    if not orders:
        return (
            "📭 Açık servis kaydınız bulunmuyor.\n\n"
            "Tamamlanmış kayıtlarınız için servisimizle iletişime geçebilirsiniz."
        )
    lines = ["📋 Açık Servis Kayıtlarınız", ""]
    for idx, o in enumerate(orders[:8], start=1):
        sn = display_or_default(o.get("serviceNumber"), f"#{o.get('id')}")
        status = str(o.get("status") or "").upper()
        emoji = STATUS_LIST_EMOJI.get(status, "📌")
        lines.append(f"{idx}️⃣ {sn}")
        lines.append(f"📱 {format_device_label(o)}")
        lines.append(f"{emoji} {work_order_status_label(status)}")
        lines.append("")
    example = orders[0].get("serviceNumber") or "SRV-2026-000021"
    lines.append("Detay için servis numarasını yazabilirsiniz:")
    lines.append("")
    lines.append(example)
    return "\n".join(lines)


def format_tech_service_list(orders):
    if not orders:
        return "📭 Size atanmış aktif iş emri bulunmuyor."
    lines = ["📋 Aktif İş Emirleriniz", ""]
    for idx, o in enumerate(orders[:8], start=1):
        sn = display_or_default(o.get("serviceNumber"), f"#{o.get('id')}")
        status = str(o.get("status") or "").upper()
        emoji = STATUS_LIST_EMOJI.get(status, "📌")
        lines.append(f"{idx}️⃣ {sn}")
        lines.append(f"📱 {format_device_label(o)}")
        lines.append(f"{emoji} {work_order_status_label(status)}")
        lines.append("")
    example = orders[0].get("serviceNumber") or "SRV-2026-000021"
    lines.append("Detay için servis numarasını yazabilirsiniz:")
    lines.append("")
    lines.append(example)
    return "\n".join(lines)


def tech_help_message():
    return (
        "❓ Teknisyen Yardım\n\n"
        "Kullanabileceğiniz işlemler:\n\n"
        "📋 Atanan işler:\n"
        "işlerim\n\n"
        "▶️ İşleme başla:\n"
        "başla SRV-2026-000021\n\n"
        "🧩 Parça bekliyor:\n"
        "parça SRV-2026-000021\n\n"
        "🔄 İşleme devam et:\n"
        "devam SRV-2026-000021\n\n"
        "✅ Teknik işlemi tamamla:\n"
        "tamamla SRV-2026-000021"
    )


def customer_help_message():
    return (
        "❓ Yardım\n\n"
        "Kullanabileceğiniz işlemler:\n\n"
        "📋 Servislerim\n"
        "🛡️ Garanti Sorgula\n\n"
        "Detay için servis numaranızı yazabilirsiniz:\n"
        "SRV-2026-000021"
    )


def format_tech_update_success(service_no, new_status):
    return (
        "✅ İş emri güncellendi\n\n"
        "🆔 Servis No\n"
        f"{display_or_default(service_no)}\n\n"
        "📌 Yeni Durum\n"
        f"{work_order_status_label(new_status)}"
    )


def warranty_status_label(status):
    if not status:
        return "Garanti durumu belirlenemedi"
    key = str(status).upper()
    mapping = {
        "AKTIF": "🟢 Garanti devam ediyor",
        "ACTIVE": "🟢 Garanti devam ediyor",
        "SURESI_DOLMUS": "🔴 Garanti süresi dolmuş",
        "EXPIRED": "🔴 Garanti süresi dolmuş",
        "TARIH_EKSIK": "⚠️ Garanti hesabı için tarih bilgisi eksik",
        "TANIMLANMAMIS": "⚠️ Bu cihaz için garanti tanımı bulunamadı",
        "UNKNOWN": "⚠️ Garanti durumu belirlenemedi",
    }
    return mapping.get(key, "⚠️ Garanti durumu belirlenemedi")


def format_warranty_reply(data, serial):
    brand = data.get("brand")
    model = data.get("model") or data.get("deviceName")
    device_line = " ".join(p for p in (brand, model) if p) or "Belirtilmedi"
    start = data.get("warrantyStart") or data.get("startDate") or "Belirtilmedi"
    end = data.get("warrantyEnd") or data.get("endDate") or "Belirtilmedi"
    return (
        "✅ Garanti Bilgisi\n\n"
        "📱 Cihaz\n"
        f"{device_line}\n\n"
        "🔢 Seri No\n"
        f"{display_or_default(data.get('serialNumber'), serial)}\n\n"
        "📅 Garanti Başlangıcı\n"
        f"{display_or_default(start)}\n\n"
        "📅 Garanti Bitişi\n"
        f"{display_or_default(end)}\n\n"
        "Durum:\n"
        f"{warranty_status_label(data.get('warrantyStatus'))}"
    )


def warranty_prompt_message():
    return (
        "🛡️ Garanti Sorgulama\n\n"
        "Lütfen cihazınızın seri numarasını yazın.\n\n"
        "Örnek:\n"
        "SAM-A54-20260001"
    )


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


async def get_user_profile(phone: str):
    """Teknisyen önce, sonra müşteri. Dönüş: {role, firstName, fullName}."""
    profile = {"role": "UNREGISTERED", "firstName": None, "fullName": None}
    try:
        token = get_token()
    except Exception:
        log.warning("Rol tespiti için token alınamadı")
        return profile

    phone_q = normalize_phone(phone) or phone
    headers = bot_headers({"Authorization": f"Bearer {token}"})
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{BACKEND_URL}/api/technicians/by-whatsapp/{phone_q}",
            headers=headers,
        )
        if resp.status_code == 200:
            data = resp.json()
            user = (data or {}).get("user") or {}
            full = user.get("fullName")
            profile["role"] = "TECHNICIAN"
            profile["fullName"] = full
            profile["firstName"] = first_name_from_full(full)
            return profile
        resp = await client.get(
            f"{BACKEND_URL}/api/customers/by-whatsapp/{phone_q}",
            headers=headers,
        )
        if resp.status_code == 200:
            data = resp.json()
            full = (data or {}).get("fullName")
            profile["role"] = "CUSTOMER"
            profile["fullName"] = full
            profile["firstName"] = first_name_from_full(full)
            return profile
        return profile


async def get_user_role(phone: str):
    profile = await get_user_profile(phone)
    return profile["role"]


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
            return MSG_SYSTEM_ERROR
        orders = resp.json().get("content", [])
        open_orders = [o for o in orders if o.get("status") in OPEN_CUSTOMER_STATUSES]
        text = format_customer_service_list(open_orders)
        if open_orders:
            set_conversation(
                phone,
                "AWAIT_STATUS_PICK",
                orders=[o.get("serviceNumber") or str(o["id"]) for o in open_orders[:8]],
            )
        return text
    except Exception:
        return MSG_SYSTEM_ERROR


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
        return MSG_SYSTEM_ERROR


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
            return (
                "❌ Bu seri numarasına ait garanti kaydı bulunamadı.\n\n"
                "Seri numarasını kontrol edip tekrar deneyebilirsiniz."
            )
        return (
            "⚠️ Garanti bilgisi şu anda alınamıyor.\n\n"
            "Lütfen daha sonra tekrar deneyin."
        )
    except Exception:
        return (
            "⚠️ Garanti bilgisi şu anda alınamıyor.\n\n"
            "Lütfen daha sonra tekrar deneyin."
        )


def _list_tech_open_orders(phone):
    phone_q = normalize_phone(phone) or phone
    resp = _get_with_auth(
        f"{BACKEND_URL}/api/workorders",
        params={"page": 0, "size": 20, "technicianWhatsapp": phone_q},
    )
    if resp.status_code != 200:
        return None, MSG_SYSTEM_ERROR
    orders = [
        o for o in resp.json().get("content", [])
        if o.get("status") in OPEN_TECH_STATUSES
    ]
    return orders, None


def find_tech_owned_work_order(phone, ref):
    """Teknisyenin kendi listesinde ref (SRV/id) ile iş emri bul."""
    orders, err = _list_tech_open_orders(phone)
    if err:
        return None, err
    cleaned = normalize_service_ref(ref)
    if not cleaned:
        return None, friendly_not_found_message()
    for o in orders:
        sn = str(o.get("serviceNumber") or "").upper()
        oid = str(o.get("id") or "")
        if cleaned == sn or cleaned == oid:
            return o, None
    # Kapalı/aktif dışı da olabilir — tam listeden dene
    phone_q = normalize_phone(phone) or phone
    try:
        resp = _get_with_auth(
            f"{BACKEND_URL}/api/workorders",
            params={"page": 0, "size": 50, "technicianWhatsapp": phone_q},
        )
        if resp.status_code == 200:
            for o in resp.json().get("content", []):
                sn = str(o.get("serviceNumber") or "").upper()
                oid = str(o.get("id") or "")
                if cleaned == sn or cleaned == oid:
                    return o, None
    except Exception:
        pass
    return None, MSG_FORBIDDEN


def handle_tech_list(phone):
    try:
        orders, err = _list_tech_open_orders(phone)
        if err:
            return err
        text = format_tech_service_list(orders)
        if orders:
            set_conversation(
                phone,
                "AWAIT_TECH_PICK",
                orders=[o.get("serviceNumber") or str(o["id"]) for o in orders[:8]],
            )
        return text
    except Exception:
        return MSG_SYSTEM_ERROR


def handle_tech_update_prompt(phone, pending_command=None):
    try:
        orders, err = _list_tech_open_orders(phone)
        if err:
            return err
        if not orders:
            return "📭 Güncellenebilir aktif iş emriniz yok."
        lines = ["📋 Güncellenebilir İş Emirleriniz", ""]
        for idx, o in enumerate(orders[:8], start=1):
            sn = display_or_default(o.get("serviceNumber"), f"#{o.get('id')}")
            status = str(o.get("status") or "").upper()
            emoji = STATUS_LIST_EMOJI.get(status, "📌")
            lines.append(f"{idx}️⃣ {sn}")
            lines.append(f"{emoji} {work_order_status_label(status)}")
            lines.append("")
        example = orders[0].get("serviceNumber") or "SRV-2026-000021"
        if pending_command:
            lines.append(f"Servis numarasını yazın. Örnek: {example}")
            set_conversation(
                phone,
                "AWAIT_TECH_CMD_REF",
                command=pending_command,
                orders=[o.get("serviceNumber") or str(o["id"]) for o in orders[:8]],
            )
        else:
            lines.append("Örnek komutlar:")
            lines.append(f"başla {example}")
            lines.append(f"parça {example}")
            lines.append(f"devam {example}")
            lines.append(f"tamamla {example}")
            set_conversation(phone, "AWAIT_TECH_UPDATE")
        return "\n".join(lines)
    except Exception:
        return MSG_SYSTEM_ERROR


def handle_tech_update(phone, work_order_id, new_status, service_no=None):
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
            body = {}
            try:
                body = resp.json()
            except Exception:
                body = {}
            sn = service_no or body.get("serviceNumber") or str(work_order_id)
            return format_tech_update_success(sn, new_status)
        if resp.status_code in (403, 404):
            return MSG_FORBIDDEN
        if resp.status_code == 400:
            return MSG_INVALID_TRANSITION
        return MSG_SYSTEM_ERROR
    except Exception:
        return MSG_SYSTEM_ERROR


def handle_tech_command(phone, command_key, status, ref):
    if not ref:
        return handle_tech_update_prompt(phone, pending_command=command_key)
    wo, err = find_tech_owned_work_order(phone, ref)
    if err:
        return err
    return handle_tech_update(
        phone,
        wo.get("id"),
        status,
        service_no=wo.get("serviceNumber"),
    )


def welcome_menu(role, first_name=None):
    if first_name:
        greeting = f"👋 Merhaba {first_name}"
    else:
        greeting = "👋 Merhaba"

    if role == "TECHNICIAN":
        body_text = (
            f"{greeting}\n\n"
            "👨‍🔧 Teknisyen İşlem Paneline hoş geldiniz.\n\n"
            "Aşağıdaki işlemlerden birini seçebilirsiniz:"
        )
        buttons = [
            {"type": "reply", "reply": {"id": "btn_islist", "title": "Atanan İşlerim"}},
            {"type": "reply", "reply": {"id": "btn_islem", "title": "İşlem Güncelle"}},
            {"type": "reply", "reply": {"id": "btn_yardim", "title": "Yardım"}},
        ]
        text_fallback = (
            f"{body_text}\n\n"
            "📋 Atanan İşlerim — işlerim\n"
            "▶️ İşleme Başla — başla SRV-...\n"
            "🧩 Parça Bekliyor — parça SRV-...\n"
            "✅ İşlemi Tamamla — tamamla SRV-...\n"
            "❓ Yardım — yardım"
        )
    else:
        body_text = (
            f"{greeting}\n\n"
            "🔧 Servis Takip Asistanına hoş geldiniz.\n\n"
            "Aşağıdaki işlemlerden birini seçebilirsiniz:"
        )
        buttons = [
            {"type": "reply", "reply": {"id": "btn_durum", "title": "Servislerim"}},
            {"type": "reply", "reply": {"id": "btn_garanti", "title": "Garanti Sorgula"}},
            {"type": "reply", "reply": {"id": "btn_yardim", "title": "Yardım"}},
        ]
        text_fallback = (
            f"{body_text}\n\n"
            "📋 Servislerim\n"
            "🛡️ Garanti Sorgula\n"
            "❓ Yardım"
        )
    return body_text, buttons, text_fallback


def tech_action_submenu():
    body = (
        "🛠️ İşlem Güncelle\n\n"
        "Yapmak istediğiniz işlemi seçin:"
    )
    buttons = [
        {"type": "reply", "reply": {"id": "btn_basla", "title": "İşleme Başla"}},
        {"type": "reply", "reply": {"id": "btn_parca", "title": "Parça Bekliyor"}},
        {"type": "reply", "reply": {"id": "btn_tamamla", "title": "Tamamla"}},
    ]
    fallback = (
        f"{body}\n\n"
        "▶️ başla SRV-...\n"
        "🧩 parça SRV-...\n"
        "🔄 devam SRV-...\n"
        "✅ tamamla SRV-..."
    )
    return body, buttons, fallback


async def send_menu(phone, role, first_name=None):
    body_text, buttons, fallback = welcome_menu(role, first_name)
    ok = await send_interactive_buttons(phone, body_text, buttons)
    if ok:
        return "Menü gönderildi."
    return fallback


async def send_tech_action_menu(phone):
    body, buttons, fallback = tech_action_submenu()
    ok = await send_interactive_buttons(phone, body, buttons)
    if ok:
        return "Menü gönderildi."
    return fallback


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
                button_map = {
                    "btn_islist": "!isliste",
                    "btn_guncelle": "!islem",
                    "btn_islem": "!islem",
                    "btn_garanti": "!garanti",
                    "btn_durum": "!durum",
                    "btn_servislerim": "!durum",
                    "btn_yardim": "!yardim",
                    "btn_basla": "!basla",
                    "btn_parca": "!parca",
                    "btn_tamamla": "!tamamla",
                    "btn_devam": "!devam",
                }
                text = button_map.get(button_id)
                if not text:
                    return JSONResponse(content={"status": "ignored"}, status_code=200)
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
                await send_whatsapp_message(phone, MSG_SYSTEM_ERROR)
                return JSONResponse(content={"status": "error"}, status_code=200)

        response_text = ""
        conv = get_conversation(phone)
        skip_outbound = False

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
                    response_text = MSG_UNKNOWN_COMMAND
            elif is_service_number(pick) or pick.lower().startswith("durum"):
                clear_conversation(phone)
                ref, list_only = parse_status_command(
                    pick if pick.lower().startswith("durum") else f"durum {pick}"
                )
                if list_only or not ref:
                    response_text = handle_customer_status_list(phone)
                else:
                    response_text = handle_status_lookup(phone, ref)
            else:
                response_text = MSG_UNKNOWN_COMMAND

        # Conversation: teknisyen listeden seçim
        elif conv and conv.get("state") == "AWAIT_TECH_PICK" and not text.startswith("!"):
            pick = text.strip()
            order_refs = conv.get("orders") or []
            if pick.isdigit() and 1 <= int(pick) <= len(order_refs):
                clear_conversation(phone)
                wo, err = find_tech_owned_work_order(phone, order_refs[int(pick) - 1])
                response_text = err or format_work_order_detail(wo)
            elif is_service_number(pick) or pick.isdigit():
                clear_conversation(phone)
                wo, err = find_tech_owned_work_order(phone, pick)
                response_text = err or format_work_order_detail(wo)
            else:
                cmd, status, ref = parse_tech_command(pick)
                if cmd:
                    clear_conversation(phone)
                    response_text = handle_tech_command(phone, cmd, status, ref)
                else:
                    response_text = MSG_UNKNOWN_COMMAND

        # Conversation: teknisyen komutu için servis no bekleniyor
        elif conv and conv.get("state") == "AWAIT_TECH_CMD_REF" and not text.startswith("!"):
            pending_cmd = conv.get("command") or "başla"
            status = TECH_COMMAND_STATUS.get(pending_cmd) or TECH_COMMAND_STATUS.get(
                str(pending_cmd).lower()
            )
            pick = text.strip()
            order_refs = conv.get("orders") or []
            ref = None
            if pick.isdigit() and 1 <= int(pick) <= len(order_refs):
                ref = order_refs[int(pick) - 1]
            else:
                ref = normalize_service_ref(pick)
            if status and ref:
                response_text = handle_tech_command(phone, pending_cmd, status, ref)
            else:
                response_text = MSG_UNKNOWN_COMMAND

        # Conversation: teknisyen güncelleme devamı (eski format)
        elif conv and conv.get("state") == "AWAIT_TECH_UPDATE" and not text.startswith("!"):
            cmd, status, ref = parse_tech_command(text)
            if cmd:
                response_text = handle_tech_command(phone, cmd, status, ref)
            else:
                parts = text.split()
                if len(parts) >= 2 and parts[0].isdigit():
                    mapped = TECH_COMMAND_STATUS.get(parts[1].lower())
                    if mapped:
                        response_text = handle_tech_command(phone, parts[1].lower(), mapped, parts[0])
                    elif parts[1].upper() in STATUS_LABELS_TR:
                        response_text = handle_tech_update(phone, parts[0], parts[1].upper())
                    else:
                        response_text = MSG_UNKNOWN_COMMAND
                else:
                    response_text = MSG_UNKNOWN_COMMAND

        elif text.startswith("!yardim") or is_greeting(text):
            profile = await get_user_profile(phone)
            role = profile["role"]
            if role == "UNREGISTERED":
                response_text = "Sisteme kayıtlı bir numara değilsiniz. Lütfen önce kaydolun."
            elif text.startswith("!yardim") and role == "TECHNICIAN":
                response_text = tech_help_message()
            elif text.startswith("!yardim") and role == "CUSTOMER":
                response_text = customer_help_message()
            else:
                response_text = await send_menu(phone, role, profile.get("firstName"))
                if response_text == "Menü gönderildi.":
                    skip_outbound = True

        elif text.startswith("!isliste") or text.lower() in ("işlerim", "islerim", "atanan işlerim"):
            response_text = handle_tech_list(phone)

        elif text.startswith("!islem") or text.startswith("!guncelle"):
            parts = text.split()
            if len(parts) >= 3:
                # Eski: !guncelle ID STATUS
                status_arg = parts[2].upper()
                mapped = TECH_COMMAND_STATUS.get(parts[2].lower()) or (
                    status_arg if status_arg in STATUS_LABELS_TR else None
                )
                if mapped:
                    response_text = handle_tech_command(phone, parts[2].lower(), mapped, parts[1])
                else:
                    response_text = MSG_UNKNOWN_COMMAND
            else:
                response_text = await send_tech_action_menu(phone)
                if response_text == "Menü gönderildi.":
                    skip_outbound = True

        elif text.startswith("!basla") or text.startswith("!parca") or text.startswith("!tamamla") or text.startswith("!devam"):
            cmd, status, ref = parse_tech_command(text.lstrip("!"))
            # button sends !basla without SRV
            if not cmd:
                key = text.lstrip("!").split()[0].lower()
                aliases = {"basla": "başla", "parca": "parça", "tamamla": "tamamla", "devam": "devam"}
                cmd = aliases.get(key, key)
                status = TECH_COMMAND_STATUS.get(cmd)
                ref = None
            response_text = handle_tech_command(phone, cmd, status, ref)

        elif text.startswith("!garanti"):
            parts = text.split()
            if len(parts) >= 2:
                clear_conversation(phone)
                response_text = handle_warranty_query(phone, parts[1])
            else:
                set_conversation(phone, "AWAIT_SERIAL")
                response_text = warranty_prompt_message()

        elif text.lower().startswith("!durum") or text.lower().startswith("durum") or text.lower() in ("servislerim", "!servislerim"):
            ref, list_only = parse_status_command(text if "durum" in text.lower() or text.startswith("!") else "durum")
            clear_conversation(phone)
            if list_only or not ref:
                response_text = handle_customer_status_list(phone)
            else:
                response_text = handle_status_lookup(phone, ref)

        else:
            # Teknisyen Türkçe komutları
            cmd, status, ref = parse_tech_command(text)
            if cmd:
                response_text = handle_tech_command(phone, cmd, status, ref)
            else:
                bare_ref, _ = parse_status_command(text)
                if bare_ref and (is_service_number(bare_ref) or bare_ref.isdigit()):
                    clear_conversation(phone)
                    profile = await get_user_profile(phone)
                    if profile["role"] == "TECHNICIAN":
                        wo, err = find_tech_owned_work_order(phone, bare_ref)
                        response_text = err or format_work_order_detail(wo)
                    else:
                        response_text = handle_status_lookup(phone, bare_ref)
                else:
                    profile = await get_user_profile(phone)
                    role = profile["role"]
                    if role == "UNREGISTERED":
                        response_text = "Sisteme kayıtlı bir numara değilsiniz. Lütfen önce kaydolun."
                    else:
                        response_text = await send_menu(phone, role, profile.get("firstName"))
                        if response_text == "Menü gönderildi.":
                            skip_outbound = True

        if response_text and not skip_outbound:
            await send_whatsapp_message(phone, response_text)
            await log_bot_interaction(
                direction="OUTBOUND",
                phone=phone,
                messageType="text",
                command=command_summary,
                status="SENT",
                messageSummary=(response_text or "")[:120],
            )
        elif skip_outbound:
            await log_bot_interaction(
                direction="OUTBOUND",
                phone=phone,
                messageType="interactive",
                command=command_summary,
                status="SENT",
                messageSummary="menu",
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
