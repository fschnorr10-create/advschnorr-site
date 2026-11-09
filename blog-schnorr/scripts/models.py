"""Validação independente de artigos e configuração do blog estático."""
from __future__ import annotations

import re
from datetime import datetime
from urllib.parse import urlsplit

SLUG_RE = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*\Z")
RESERVED_SLUGS = {"index", "assets", "artigos", "feed", "sitemap", "robots", "404"}
ARTICLE_FIELDS = {"slug", "title", "excerpt", "category", "author", "published_at", "status", "body", "sources", "tags", "reviewed_at"}
REQUIRED_FIELDS = ARTICLE_FIELDS - {"tags", "reviewed_at"}


class ValidationError(ValueError):
    """Um dado editorial não atende ao contrato de publicação."""


def text_field(value: object, field: str, limit: int) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValidationError(f"{field}: informe um texto não vazio.")
    result = value.strip()
    if len(result) > limit:
        raise ValidationError(f"{field}: limite de {limit} caracteres excedido.")
    if any(ord(char) < 32 and char not in "\n\r\t" for char in result):
        raise ValidationError(f"{field}: contém caracteres de controle não permitidos.")
    return result


def safe_slug(value: object) -> str:
    if not isinstance(value, str) or len(value) > 90 or not SLUG_RE.fullmatch(value):
        raise ValidationError("slug: use até 90 caracteres minúsculos, números e hífens, sem caminhos ou extensões.")
    if value in RESERVED_SLUGS:
        raise ValidationError("slug: este identificador é reservado pelo blog.")
    return value


def parse_date(value: object, field: str = "published_at") -> datetime:
    if not isinstance(value, str):
        raise ValidationError(f"{field}: use uma data ISO 8601 com fuso horário.")
    try:
        result = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as error:
        raise ValidationError(f"{field}: data ISO 8601 inválida.") from error
    if result.tzinfo is None or result.utcoffset() is None:
        raise ValidationError(f"{field}: a data precisa informar fuso horário, como -03:00 ou Z.")
    return result


def safe_url(value: object, field: str = "url") -> str:
    if not isinstance(value, str) or not value or value != value.strip():
        raise ValidationError(f"{field}: informe uma URL HTTPS válida.")
    if any(char.isspace() or ord(char) < 32 for char in value) or "\\" in value:
        raise ValidationError(f"{field}: a URL contém espaços ou caracteres não permitidos.")
    try:
        parsed = urlsplit(value)
        port = parsed.port
    except ValueError as error:
        raise ValidationError(f"{field}: URL inválida.") from error
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password or port not in (None, 443):
        raise ValidationError(f"{field}: apenas URLs HTTPS sem credenciais e sem portas alternativas são aceitas.")
    return value


def validate_article(data: object) -> dict:
    if not isinstance(data, dict):
        raise ValidationError("O artigo precisa ser um objeto JSON.")
    missing = sorted(REQUIRED_FIELDS - data.keys())
    unknown = sorted(data.keys() - ARTICLE_FIELDS)
    if missing:
        raise ValidationError("Campos obrigatórios ausentes: " + ", ".join(missing) + ".")
    if unknown:
        raise ValidationError("Campos desconhecidos: " + ", ".join(unknown) + ".")
    result = dict(data)
    result["slug"] = safe_slug(data["slug"])
    for field, limit in (("title", 180), ("excerpt", 500), ("category", 70), ("author", 120), ("body", 150_000)):
        result[field] = text_field(data[field], field, limit)
    if data["status"] not in ("draft", "published"):
        raise ValidationError("status: use 'draft' ou 'published'.")
    parse_date(data["published_at"])
    if "reviewed_at" in data:
        parse_date(data["reviewed_at"], "reviewed_at")
    sources = data["sources"]
    if not isinstance(sources, list) or len(sources) > 40:
        raise ValidationError("sources: use uma lista com até 40 fontes.")
    if data["status"] == "published" and not sources:
        raise ValidationError("sources: um artigo publicado precisa ter pelo menos uma fonte verificável.")
    result["sources"] = []
    for index, source in enumerate(sources):
        if not isinstance(source, dict) or set(source) != {"title", "url"}:
            raise ValidationError(f"sources[{index}]: informe exatamente title e url.")
        result["sources"].append({"title": text_field(source["title"], f"sources[{index}].title", 200), "url": safe_url(source["url"], f"sources[{index}].url")})
    tags = data.get("tags", [])
    if not isinstance(tags, list) or len(tags) > 12:
        raise ValidationError("tags: use uma lista com até 12 etiquetas.")
    result["tags"] = list(dict.fromkeys(text_field(tag, "tags", 50) for tag in tags))
    return result


def validate_config(data: object) -> dict:
    if not isinstance(data, dict):
        raise ValidationError("A configuração precisa ser um objeto JSON.")
    result = dict(data)
    for field in ("site_url", "institutional_url"):
        result[field] = safe_url(data.get(field), field).rstrip("/")
        parsed = urlsplit(result[field])
        if parsed.query or parsed.fragment or parsed.path not in ("", "/"):
            raise ValidationError(f"{field}: informe a origem HTTPS sem caminho, consulta ou fragmento.")
    result["site_title"] = text_field(data.get("site_title", "Schnorr | Conhecimento e estratégia"), "site_title", 180)
    result["site_description"] = text_field(data.get("site_description", "Publicações do Schnorr & Advogados Associados."), "site_description", 500)
    return result
