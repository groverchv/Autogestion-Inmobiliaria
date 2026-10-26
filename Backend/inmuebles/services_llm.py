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
DEFAULT_TEXT_MODEL = 'llama-3.1-8b-instant'


def _gemini(messages: list, max_tokens: int, temperature: float) -> Optional[str]:
    api_key = getattr(settings, 'GEMINI_API_KEY', '')
    if not api_key:
        return None
    model = getattr(settings, 'GEMINI_VISION_MODEL', 'gemini-2.5-flash')
    url = (
        f'https://generativelanguage.googleapis.com/v1beta/models/'
        f'{model}:generateContent?key={api_key}'
    )
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
    try:
        resp = requests.post(
            url,
            json={
                'system_instruction': {'parts': [{'text': sistema}]},
                'contents': contents,
                'generationConfig': {
                    'maxOutputTokens': max_tokens,
                    'temperature': temperature,
                    # 2.5-flash gasta tokens en "thinking" interno; sin esto las
                    # respuestas del asistente salen cortadas a mitad de frase.
                    'thinkingConfig': {'thinkingBudget': 0},
                },
            },
            headers={'Content-Type': 'application/json'},
            timeout=40,
        )
        if resp.status_code != 200:
            logger.warning('Gemini respondió %s: %s', resp.status_code, resp.text[:200])
            return None
        candidatos = resp.json().get('candidates') or []
        if not candidatos:
            return None
        partes = (candidatos[0].get('content') or {}).get('parts') or []
        texto = ''.join(p.get('text', '') for p in partes).strip()
        return texto or None
    except Exception as e:
        logger.warning('Error llamando a Gemini: %s', e)
        return None


def _openai_compatible(url: str, api_key: Optional[str], model: str,
                       messages: list, max_tokens: int, temperature: float) -> Optional[str]:
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
            timeout=40,
        )
        if resp.status_code != 200:
            logger.warning('%s respondió %s: %s', url, resp.status_code, resp.text[:200])
            return None
        return resp.json()['choices'][0]['message']['content'].strip()
    except Exception as e:
        logger.warning('Error llamando a %s: %s', url, e)
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
