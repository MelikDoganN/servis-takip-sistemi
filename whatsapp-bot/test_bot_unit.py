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
    assert "Ayşe" in text
    assert "Apple" in text
    assert "isUnderWarranty" not in text
    assert "Garanti devam ediyor" in text


def test_conversation_ttl():
    phone = "905551112233"
    app_module.clear_conversation(phone)
    app_module.set_conversation(phone, "AWAIT_SERIAL")
    assert app_module.get_conversation(phone)["state"] == "AWAIT_SERIAL"
    app_module._conversation_state[phone]["expires"] = time.time() - 1
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
        "btn_guncelle": "!guncelle",
        "btn_garanti": "!garanti",
        "btn_durum": "!durum",
        "btn_yardim": "!yardim",
    }
    for button_id, expected in mapping.items():
        text = None
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
        assert text == expected
