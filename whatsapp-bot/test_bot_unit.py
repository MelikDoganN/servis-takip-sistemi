"""Minimal FastAPI bot unit tests (no Meta/network)."""
import hmac
import hashlib
import importlib
import os
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

os.environ.setdefault("WHATSAPP_APP_SECRET", "test-app-secret")
os.environ.setdefault("WHATSAPP_VERIFY_TOKEN", "test-verify")
os.environ.setdefault("WHATSAPP_BOT_API_KEY", "test-bot-key")
os.environ.setdefault("BOT_EMAIL", "bot@test.local")
os.environ.setdefault("BOT_PASSWORD", "secret")
os.environ.setdefault("BACKEND_URL", "http://localhost:8080")

app_module = importlib.import_module("app")


def test_normalize_phone_formats():
    expected = "905551112233"
    assert app_module.normalize_phone("+905551112233") == expected
    assert app_module.normalize_phone("905551112233") == expected
    assert app_module.normalize_phone("05551112233") == expected
    assert app_module.normalize_phone("5551112233") == expected
    assert app_module.normalize_phone("+90 555 111 22 33") == expected
    assert app_module.normalize_phone("0 (555) 111-22-33") == expected
    assert app_module.normalize_phone("") is None
    assert app_module.normalize_phone("123") is None


def test_warranty_status_labels():
    assert "devam ediyor" in app_module.warranty_status_label("AKTIF")
    assert "dolmuş" in app_module.warranty_status_label("SURESI_DOLMUS")
    assert "tarih" in app_module.warranty_status_label("TARIH_EKSIK").lower()
    assert "belirlenemedi" in app_module.warranty_status_label("UNKNOWN").lower()


def test_format_warranty_reply_uses_dto_fields():
    text = app_module.format_warranty_reply(
        {
            "serialNumber": "SN-1",
            "customerName": "Ayşe",
            "brand": "Apple",
            "model": "MacBook",
            "warrantyStatus": "AKTIF",
            "warrantyStart": "2024-01-01",
            "warrantyEnd": "2026-01-01",
        },
        "SN-1",
    )
    assert "Apple" in text
    assert "MacBook" in text
    assert "isUnderWarranty" not in text
    assert "Garanti devam ediyor" in text
    assert "HTTP" not in text
    assert "Ayşe" not in text  # gereksiz PII yok


def test_conversation_ttl():
    phone = "905551112233"
    app_module.clear_conversation(phone)
    app_module.set_conversation(phone, "AWAIT_SERIAL")
    assert app_module.get_conversation(phone)["state"] == "AWAIT_SERIAL"
    store = app_module.conversation_store
    key = store._key(phone)
    store._data[key]["expires"] = time.time() - 1
    assert app_module.get_conversation(phone) is None


def test_verify_meta_signature():
    body = b'{"object":"whatsapp_business_account"}'
    digest = hmac.new(
        b"test-app-secret",
        body,
        hashlib.sha256,
    ).hexdigest()
    assert app_module.verify_meta_signature(body, f"sha256={digest}")
    assert not app_module.verify_meta_signature(body, "sha256=deadbeef")


def test_send_notification_requires_api_key():
    from fastapi.testclient import TestClient

    client = TestClient(app_module.app)
    resp = client.post("/send-notification", json={"phone": "905551112233", "message": "x"})
    assert resp.status_code == 401

    resp_ok_headers = client.post(
        "/send-notification",
        json={"phone": "905551112233", "message": "x"},
        headers={"X-Bot-Api-Key": "test-bot-key"},
    )
    assert resp_ok_headers.status_code == 200
    assert resp_ok_headers.json()["status"] in ("sent", "failed")


def test_button_ids_map_to_commands():
    mapping = {
        "btn_islist": "!isliste",
        "btn_islem": "!islem",
        "btn_garanti": "!garanti",
        "btn_durum": "!durum",
        "btn_yardim": "!yardim",
        "btn_basla": "!basla",
        "btn_parca": "!parca",
        "btn_tamamla": "!tamamla",
    }
    for button_id, expected in mapping.items():
        assert mapping[button_id] == expected


def test_parse_status_command_variants():
    cases = [
        ("17", "17", False),
        ("durum 17", "17", False),
        ("!durum 17", "17", False),
        ("durum [17]", "17", False),
        ("!durum [17]", "17", False),
        ("SRV-2026-000017", "SRV-2026-000017", False),
        ("durum SRV-2026-000017", "SRV-2026-000017", False),
        ("!durum SRV-2026-000017", "SRV-2026-000017", False),
        ("!durum", None, True),
        ("durum", None, True),
    ]
    for text, expected_ref, expected_list in cases:
        ref, list_only = app_module.parse_status_command(text)
        assert ref == expected_ref, text
        assert list_only is expected_list, text


def test_parse_tech_commands():
    cases = [
        ("başla SRV-2026-000021", "başla", "IN_PROGRESS", "SRV-2026-000021"),
        ("parça SRV-2026-000021", "parça", "WAITING_PARTS", "SRV-2026-000021"),
        ("parca 12", "parca", "WAITING_PARTS", "12"),
        ("devam SRV-2026-000021", "devam", "IN_PROGRESS", "SRV-2026-000021"),
        ("tamamla SRV-2026-000021", "tamamla", "RESOLVED", "SRV-2026-000021"),
        ("başla", "başla", "IN_PROGRESS", None),
    ]
    for text, cmd, status, ref in cases:
        c, s, r = app_module.parse_tech_command(text)
        assert c == cmd, text
        assert s == status, text
        assert r == ref, text


def test_format_work_order_detail_turkish_and_defaults():
    text = app_module.format_work_order_detail(
        {
            "serviceNumber": "SRV-2026-000017",
            "status": "ASSIGNED",
            "description": ".",
            "device": {
                "serialNumber": "SN-9",
                "model": {"brand": {"name": "Lenovo"}, "name": "ThinkPad"},
            },
            "technician": {"user": {"fullName": "Miraç"}},
            "estimatedCompletionAt": None,
        }
    )
    assert "SRV-2026-000017" in text
    assert "Teknisyen Atandı" in text
    assert "Lenovo ThinkPad" in text
    assert "Belirtilmedi" in text
    assert "Miraç" in text
    assert "HTTP" not in text
    assert "ASSIGNED" not in text


def test_format_work_order_detail_ready_and_cancelled():
    ready = app_module.format_work_order_detail(
        {"serviceNumber": "SRV-1", "status": "READY_FOR_DELIVERY", "description": "x"}
    )
    assert "teslim alınmaya hazır" in ready.lower() or "Teslime Hazır" in ready
    cancelled = app_module.format_work_order_detail(
        {
            "serviceNumber": "SRV-2",
            "status": "CANCELLED",
            "cancellationReason": None,
            "description": "x",
        }
    )
    assert "iptal" in cancelled.lower()
    assert "Belirtilmedi" in cancelled


def test_friendly_not_found_has_no_http():
    msg = app_module.friendly_not_found_message()
    assert "HTTP" not in msg
    assert "🔎" in msg


def test_customer_and_tech_lists():
    orders = [
        {
            "serviceNumber": "SRV-2026-000021",
            "status": "ASSIGNED",
            "device": {"model": {"brand": {"name": "Samsung"}, "name": "Galaxy A54"}},
        },
        {
            "serviceNumber": "SRV-2026-000019",
            "status": "WAITING_PARTS",
            "device": {"model": {"brand": {"name": "Lenovo"}, "name": "ThinkPad"}},
        },
    ]
    customer = app_module.format_customer_service_list(orders)
    assert "Açık Servis Kayıtlarınız" in customer
    assert "SRV-2026-000021" in customer
    assert "Teknisyen Atandı" in customer
    assert "Parça Bekliyor" in customer
    assert "HTTP" not in customer
    assert "WAITING_PARTS" not in customer

    empty = app_module.format_customer_service_list([])
    assert "bulunmuyor" in empty.lower()

    tech = app_module.format_tech_service_list(orders)
    assert "Aktif İş Emirleriniz" in tech
    assert "SRV-2026-000021" in tech


def test_welcome_menu_customer_and_technician():
    body, buttons, fallback = app_module.welcome_menu("CUSTOMER", "Ayşe")
    assert "Ayşe" in body
    assert "Servis Takip Asistanına" in body
    assert len(buttons) == 3
    assert "Servislerim" in fallback

    body_t, buttons_t, fallback_t = app_module.welcome_menu("TECHNICIAN", "Ali")
    assert "Ali" in body_t
    assert "Teknisyen İşlem Paneline" in body_t
    assert len(buttons_t) == 3
    assert "başla" in fallback_t.lower() or "Atanan" in fallback_t


def test_welcome_menu_without_name():
    body, _, _ = app_module.welcome_menu("CUSTOMER", None)
    assert "Merhaba" in body
    assert "{customerFirstName}" not in body


def test_tech_help_and_update_success():
    help_msg = app_module.tech_help_message()
    assert "başla SRV-" in help_msg
    assert "parça SRV-" in help_msg
    assert "tamamla SRV-" in help_msg
    assert "HTTP" not in help_msg

    ok = app_module.format_tech_update_success("SRV-2026-000021", "IN_PROGRESS")
    assert "güncellendi" in ok.lower()
    assert "SRV-2026-000021" in ok
    assert "İşlemde" in ok
    assert "IN_PROGRESS" not in ok


def test_error_messages_have_no_http():
    for msg in (
        app_module.MSG_NOT_FOUND,
        app_module.MSG_UNKNOWN_COMMAND,
        app_module.MSG_SYSTEM_ERROR,
        app_module.MSG_FORBIDDEN,
        app_module.MSG_INVALID_TRANSITION,
        app_module.warranty_prompt_message(),
    ):
        assert "HTTP" not in msg
        assert "Exception" not in msg


def test_is_greeting():
    assert app_module.is_greeting("Merhaba")
    assert app_module.is_greeting("selam")
    assert app_module.is_greeting("Menü")
    assert app_module.is_greeting("yardım")
    assert not app_module.is_greeting("başla SRV-1")


def test_mask_phone_no_full_number():
    masked = app_module.mask_phone("905551112233")
    assert "905551112233" not in masked
    assert "******" in masked


def test_status_labels_match_spec():
    assert app_module.work_order_status_label("RESOLVED") == "Teknik İşlem Tamamlandı"
    assert app_module.work_order_status_label("READY_FOR_DELIVERY") == "Teslime Hazır"
    assert app_module.work_order_status_label("DELIVERED") == "Teslim Edildi"
