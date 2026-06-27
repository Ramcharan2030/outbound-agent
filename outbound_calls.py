import json
import logging
import os
import random

from dotenv import load_dotenv
from livekit import api
from backend_config import get_outbound_sip_trunk_id, read_config as read_backend_config

load_dotenv(".env")
DEFAULT_AGENT_NAME = os.getenv("LIVEKIT_AGENT_NAME", "vobiz-demo-agent").strip() or "vobiz-demo-agent"
logger = logging.getLogger("outbound-calls")

RUNTIME_METADATA_CONFIG_KEYS = {
    "llm_provider",
    "openrouter_model",
    "first_line",
    "agent_instructions",
    "gemini_live_model",
    "gemini_live_voice",
    "gemini_live_temperature",
    "gemini_live_language",
    "gemini_live_preflight_enabled",
    "gemini_live_preflight_timeout",
    "gemini_live_connect_timeout",
    "gemini_live_connect_retries",
    "gemini_tts_model",
    "lang_preset",
    "max_turns",
    "user_away_timeout",
    "session_close_transcript_timeout",
    "kb_enabled",
    "kb_backend",
    "kb_data_dir",
    "kb_top_k",
    "kb_similarity_threshold",
    "kb_context_char_budget",
    "kb_live_timeout_ms",
    "kb_live_context_char_budget",
    "kb_cache_ttl_seconds",
    "kb_chunk_size",
    "kb_chunk_overlap",
    "kb_worker_poll_seconds",
    "kb_embedding_provider",
    "kb_embedding_model",
    "kb_embedding_fallback_provider",
    "kb_embedding_fallback_model",
    "kb_index_kind",
    "kb_rerank_enabled",
    "business_weekday_start",
    "business_weekday_end",
    "business_saturday_start",
    "business_saturday_end",
    "business_sunday_enabled",
    "business_sunday_start",
    "business_sunday_end",
}


def build_runtime_metadata_config(config: dict | None) -> dict:
    snapshot = {}
    for key in RUNTIME_METADATA_CONFIG_KEYS:
        value = (config or {}).get(key)
        if value in (None, ""):
            continue
        if key == "agent_instructions":
            value = str(value)[:8000]
        elif key == "first_line":
            value = str(value)[:1200]
        snapshot[key] = value
    return snapshot


def read_config() -> dict:
    return dict(read_backend_config())


def get_setting(config: dict, key: str, env_key: str, default: str = "") -> str:
    value = config.get(key)
    if value not in (None, ""):
        return str(value)
    return os.getenv(env_key, default)


def get_livekit_settings(config: dict | None = None) -> dict[str, str]:
    config = config or read_config()
    return {
        "url": get_setting(config, "livekit_url", "LIVEKIT_URL"),
        "api_key": get_setting(config, "livekit_api_key", "LIVEKIT_API_KEY"),
        "api_secret": get_setting(config, "livekit_api_secret", "LIVEKIT_API_SECRET"),
        "sip_trunk_id": get_outbound_sip_trunk_id(config),
    }


def normalize_phone_number(phone_number: str) -> str:
    import db as _db_module
    result = _db_module.normalize_phone_number(phone_number)
    if not result:
        raise ValueError("Phone number must start with + and country code")
    return result


def validate_livekit_settings(settings: dict[str, str]) -> None:
    if not (settings.get("url") and settings.get("api_key") and settings.get("api_secret")):
        raise ValueError("LiveKit URL, API key, and API secret must be configured first")
    if not settings.get("sip_trunk_id"):
        raise ValueError("SIP trunk ID is missing. Add it in API Credentials before placing outbound calls.")


async def resolve_outbound_trunk_id(
    sip,
    configured_trunk_id: str,
) -> str:
    response = await sip.list_outbound_trunk(api.ListSIPOutboundTrunkRequest())
    trunk_ids = [item.sip_trunk_id for item in response.items if item.sip_trunk_id]
    if configured_trunk_id in trunk_ids:
        return configured_trunk_id
    if len(trunk_ids) == 1:
        resolved = trunk_ids[0]
        logger.warning(
            "[OUTBOUND] Configured SIP trunk %s was not found; using the project's only outbound trunk %s",
            configured_trunk_id,
            resolved,
        )
        return resolved
    if not trunk_ids:
        raise ValueError("No outbound SIP trunk exists in the configured LiveKit project.")
    raise ValueError(
        f"SIP trunk {configured_trunk_id!r} was not found in the configured LiveKit project. "
        "Select a valid outbound trunk in API Credentials."
    )


async def dispatch_outbound_call(
    phone_number: str,
    *,
    config: dict | None = None,
    livekit_settings: dict[str, str] | None = None,
    caller_name: str = "",
    extra_metadata: dict | None = None,
    agent_name: str = DEFAULT_AGENT_NAME,
) -> dict:
    phone = normalize_phone_number(phone_number)
    settings = livekit_settings or get_livekit_settings(config)
    validate_livekit_settings(settings)

    room_name = f"call-{phone.replace('+', '')}-{random.randint(1000, 9999)}"
    logger.info(
        "[OUTBOUND] Creating dispatch phone=%s room=%s agent=%s trunk=%s",
        phone,
        room_name,
        agent_name,
        settings["sip_trunk_id"],
    )
    metadata = {
        "call_direction": "outbound",
        "phone_number": phone,
        "sip_trunk_id": settings["sip_trunk_id"],
    }
    runtime_config = build_runtime_metadata_config(config)
    if runtime_config:
        metadata["runtime_config"] = runtime_config
    if caller_name:
        metadata["caller_name"] = caller_name
    if extra_metadata:
        metadata.update(extra_metadata)
        metadata["call_direction"] = "outbound"
        metadata["phone_number"] = phone
        metadata["sip_trunk_id"] = settings["sip_trunk_id"]

    lk = api.LiveKitAPI(
        url=settings["url"],
        api_key=settings["api_key"],
        api_secret=settings["api_secret"],
    )
    try:
        settings["sip_trunk_id"] = await resolve_outbound_trunk_id(
            lk.sip,
            settings["sip_trunk_id"],
        )
        metadata["sip_trunk_id"] = settings["sip_trunk_id"]
        dispatch = await lk.agent_dispatch.create_dispatch(
            api.CreateAgentDispatchRequest(
                agent_name=agent_name,
                room=room_name,
                metadata=json.dumps(metadata),
            )
        )
        logger.info(
            "[OUTBOUND] Dispatch created id=%s phone=%s room=%s",
            dispatch.id,
            phone,
            room_name,
        )
        return {
            "status": "ok",
            "dispatch_id": dispatch.id,
            "room": room_name,
            "phone": phone,
            "sip_trunk_id": settings["sip_trunk_id"],
        }
    except Exception:
        logger.exception(
            "[OUTBOUND] Dispatch failed phone=%s room=%s agent=%s trunk=%s",
            phone,
            room_name,
            agent_name,
            settings["sip_trunk_id"],
        )
        raise
    finally:
        await lk.aclose()
