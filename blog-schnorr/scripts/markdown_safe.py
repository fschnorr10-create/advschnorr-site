"""Subconjunto deliberadamente pequeno de Markdown, sem HTML executável."""
from __future__ import annotations

import html
import re

try:
    from .models import ValidationError, safe_url
except ImportError:
    from models import ValidationError, safe_url

LINK_RE = re.compile(r"\[([^\]\n]+)\]\(([^\s()]+)\)")


def inline(text: str) -> str:
    """Escape tudo; converta somente links HTTPS validados."""
    parts = []
    offset = 0
    for match in LINK_RE.finditer(text):
        parts.append(html.escape(text[offset:match.start()]))
        try:
            url = safe_url(match.group(2))
        except ValidationError:
            parts.append(html.escape(match.group(0)))
        else:
            parts.append(f'<a href="{html.escape(url, quote=True)}" target="_blank" rel="noopener noreferrer">{html.escape(match.group(1))}</a>')
        offset = match.end()
    parts.append(html.escape(text[offset:]))
    return "".join(parts)


def render_markdown(body: str) -> str:
    blocks = []
    paragraph = []
    list_type = None

    def flush_paragraph():
        if paragraph:
            blocks.append("<p>" + inline(" ".join(paragraph)) + "</p>")
            paragraph.clear()

    def close_list():
        nonlocal list_type
        if list_type:
            blocks.append(f"</{list_type}>")
            list_type = None

    for raw_line in body.splitlines():
        line = raw_line.strip()
        if not line:
            flush_paragraph()
            close_list()
            continue
        heading = re.match(r"^(#{2,3})\s+(.+)$", line)
        item = re.match(r"^(?:[-*]\s+|\d+\.\s+)(.+)$", line)
        if heading:
            flush_paragraph()
            close_list()
            level = len(heading.group(1))
            blocks.append(f"<h{level}>" + inline(heading.group(2)) + f"</h{level}>")
        elif item:
            flush_paragraph()
            desired_type = "ol" if re.match(r"^\d+\.", line) else "ul"
            if list_type != desired_type:
                close_list()
                blocks.append(f"<{desired_type}>")
                list_type = desired_type
            blocks.append("<li>" + inline(item.group(1)) + "</li>")
        else:
            close_list()
            paragraph.append(line)
    flush_paragraph()
    close_list()
    return "\n".join(blocks)
