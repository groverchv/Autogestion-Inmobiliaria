"""
Cliente LLM unificado de solo texto con cadena de proveedores:
Gemini -> Groq -> LM Studio local.

Todos los asistentes del backend (contratos, creador IA, asistente espacial)
usan esta cadena, así si un proveedor cae o la key expira el siguiente
responde sin cambiar la lógica de negocio.
"""
import logging
from typing import Optional

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
DEFAULT_TEXT_MODEL = 'openai/gpt-oss-20b'

# Circuit breaker: si un proveedor devuelve 429 o no responde, se marca
# caído por un rato y las llamadas siguientes pasan directo al siguiente
# en la cadena (evita que cada consulta pague el timeout del caído).
_PROVIDER_COOLDOWN_S = 300


def proveedor_activo(nombre: str) -> bool:
    try:
        from django.core.cache import cache
        return not cache.get(f'llm_down:{nombre}')
    except Exception:
        return True


def marcar_proveedor_caido(nombre: str) -> None:
    try:
        from django.core.cache import cache
        cache.set(f'llm_down:{nombre}', True, _PROVIDER_COOLDOWN_S)
        logger.warning('Proveedor LLM %s marcado caído por %ss', nombre, _PROVIDER_COOLDOWN_S)
    except Exception:
        pass


def _gemini_modelos() -> list:
    """Cadena de modelos Gemini a probar en orden. El primero es el
    configurado; los siguientes son respaldos con cuota independiente."""
    principal = getattr(settings, 'GEMINI_VISION_MODEL', 'gemini-2.5-flash')
    extra = getattr(
        settings, 'GEMINI_VISION_FALLBACK_MODELS',
        'gemini-flash-lite-latest,gemini-3.5-flash-lite,gemini-3.5-flash',
    )
    modelos = []
    for m in f'{principal},{extra}'.split(','):
        m = m.strip()
        if m and m not in modelos:
            modelos.append(m)
    return modelos


def _gemini(messages: list, max_tokens: int, temperature: float) -> Optional[str]:
    api_key = getattr(settings, 'GEMINI_API_KEY', '')
    if not api_key or not proveedor_activo('gemini'):
        return None
    sistema = '\n'.join(m['content'] for m in messages if m.get('role') == 'system')
    contents = [
        {
            'role': 'model' if m.get('role') == 'assistant' else 'user',
            'parts': [{'text': m['content']}],
        }
        for m in messages
        if m.get('role') != 'system' and m.get('content')
    ]
    if not contents:
        return None
    ultimo_error = None
    for model in _gemini_modelos():
        generation_config = {
            'maxOutputTokens': max_tokens,
            'temperature': temperature,
        }
        # Solo la familia 2.5 soporta thinkingBudget: 0
        if '2.5' in model:
            generation_config['thinkingConfig'] = {'thinkingBudget': 0}
        url = (
            f'https://generativelanguage.googleapis.com/v1beta/models/'
            f'{model}:generateContent?key={api_key}'
        )
        try:
            resp = requests.post(
                url,
                json={
                    'system_instruction': {'parts': [{'text': sistema}]},
                    'contents': contents,
                    'generationConfig': generation_config,
                },
                headers={'Content-Type': 'application/json'},
                timeout=12,
            )
        except Exception as e:
            logger.warning('Error llamando a Gemini (%s): %s', model, e)
            ultimo_error = e
            continue
        if resp.status_code == 200:
            try:
                candidatos = resp.json().get('candidates') or []
                if not candidatos:
                    ultimo_error = f'{model}: sin candidatos'
                    continue
                partes = (candidatos[0].get('content') or {}).get('parts') or []
                texto = ''.join(p.get('text', '') for p in partes).strip()
                if texto:
                    return texto
                ultimo_error = f'{model}: respuesta vacía'
            except Exception as e:
                logger.warning('Error parseando respuesta de Gemini (%s): %s', model, e)
                ultimo_error = e
            continue
        logger.warning('Gemini (%s) respondió %s: %s', model, resp.status_code, resp.text[:200])
        ultimo_error = f'{model}: HTTP {resp.status_code}'
        continue

    if ultimo_error is not None:
        err = str(ultimo_error)
        if any(c in err for c in ('429', '500', '502', '503', '504')) or not isinstance(ultimo_error, str):
            marcar_proveedor_caido('gemini')
    return None


def _nombre_proveedor(url: str) -> str:
    if 'groq' in url:
        return 'groq'
    if 'gemini' in url or 'googleapis' in url:
        return 'gemini'
    return 'local'


def _openai_compatible(url: str, api_key: Optional[str], model: str,
                       messages: list, max_tokens: int, temperature: float) -> Optional[str]:
    nombre = _nombre_proveedor(url)
    if not proveedor_activo(nombre):
        return None
    headers = {'Content-Type': 'application/json'}
    if api_key:
        headers['Authorization'] = f'Bearer {api_key}'
    try:
        resp = requests.post(
            url,
            json={
                'model': model,
                'messages': messages,
                'temperature': temperature,
                'max_tokens': max_tokens,
            },
            headers=headers,
            timeout=10 if nombre != 'local' else 6,
        )
        if resp.status_code != 200:
            logger.warning('%s respondió %s: %s', url, resp.status_code, resp.text[:200])
            if resp.status_code in (429, 500, 502, 503, 504):
                marcar_proveedor_caido(nombre)
            return None
        return resp.json()['choices'][0]['message']['content'].strip()
    except Exception as e:
        logger.warning('Error llamando a %s: %s', url, e)
        marcar_proveedor_caido(nombre)
        return None


def llm_chat(messages: list, max_tokens: int = 512,
             temperature: float = 0.2, model: Optional[str] = None) -> Optional[str]:
    """Devuelve el texto de la primera IA que responda, o None si todas fallan."""
    texto = _gemini(messages, max_tokens, temperature)
    if texto:
        return texto

    if getattr(settings, 'GROQ_API_KEY', ''):
        texto = _openai_compatible(
            GROQ_API_URL, settings.GROQ_API_KEY,
            model or getattr(settings, 'GROQ_TEXT_MODEL', DEFAULT_TEXT_MODEL),
            messages, max_tokens, temperature,
        )
        if texto:
            return texto

    local_url = getattr(settings, 'LOCAL_AI_URL', '')
    if local_url:
        texto = _openai_compatible(
            local_url, None,
            getattr(settings, 'LOCAL_AI_MODEL', 'local-llm'),
            messages, max_tokens, temperature,
        )
        if texto:
            return texto

    return None
