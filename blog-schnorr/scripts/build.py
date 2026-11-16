#!/usr/bin/env python3
"""Gera o blog sem dependências externas e sem conteúdo editorial executável."""
from __future__ import annotations

import argparse
import email.utils
import html
import json
import math
import re
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit
from xml.etree import ElementTree as ET

try:
    from .models import ValidationError, parse_date, validate_article, validate_config
    from .markdown_safe import render_markdown
except ImportError:
    from models import ValidationError, parse_date, validate_article, validate_config
    from markdown_safe import render_markdown

PROJECT_ROOT = Path(__file__).resolve().parents[1]
MONTHS = ("janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro")


def reject_duplicate_keys(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValidationError(f"Campo JSON duplicado: {key}.")
        result[key] = value
    return result


def read_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=reject_duplicate_keys)
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        raise ValidationError(f"{path.name}: não foi possível ler um JSON UTF-8 válido: {error}") from error


def safe_json(value) -> str:
    """JSON embutível em script, inclusive quando o texto contém </script>."""
    return (json.dumps(value, ensure_ascii=False, separators=(",", ":"))
            .replace("&", "\\u0026").replace("<", "\\u003c").replace(">", "\\u003e")
            .replace("\u2028", "\\u2028").replace("\u2029", "\\u2029"))


def esc(value) -> str:
    return html.escape(str(value), quote=True)


def human_date(value: str) -> str:
    date = parse_date(value)
    return f"{date.day} de {MONTHS[date.month - 1]} de {date.year}"


def reading_time(post: dict) -> str:
    minutes = max(1, math.ceil(len(re.findall(r"\w+", post["body"])) / 200))
    return f"{minutes} min de leitura"


def load_articles(content_dir: Path) -> list[dict]:
    posts = []
    seen = set()
    if not content_dir.is_dir():
        raise ValidationError(f"Pasta de artigos não encontrada: {content_dir}.")
    for path in sorted(content_dir.glob("*.json")):
        try:
            post = validate_article(read_json(path))
        except ValidationError as error:
            raise ValidationError(f"{path.name}: {error}") from error
        if path.stem != post["slug"]:
            raise ValidationError(f"{path.name}: o nome do arquivo precisa corresponder ao slug '{post['slug']}.json'.")
        if post["slug"] in seen:
            raise ValidationError(f"Slug duplicado: {post['slug']}.")
        seen.add(post["slug"])
        posts.append(post)
    return sorted(posts, key=lambda post: (parse_date(post["published_at"]), post["slug"]), reverse=True)


def eligible(post: dict, now: datetime, demo: bool = False) -> bool:
    return demo or (post["status"] == "published" and parse_date(post["published_at"]) <= now)


def apply_template(template: str, values: dict[str, str]) -> str:
    result = re.sub(r"@@([A-Z_]+)@@", lambda match: values.get(match.group(1), match.group(0)), template)
    unresolved = sorted(set(re.findall(r"@@([A-Z_]+)@@", result)))
    if unresolved:
        raise ValidationError("Tokens de template sem valor: " + ", ".join(unresolved) + ".")
    return result


def post_url(post: dict, prefix: str = "") -> str:
    return f"{prefix}artigos/{post['slug']}/index.html"


def status_note(post: dict, now: datetime, demo: bool) -> str:
    if not demo:
        return ""
    if post["status"] == "draft":
        return '<span class="demo-label">Rascunho demonstrativo · não publicado</span>'
    if parse_date(post["published_at"]) > now:
        return '<span class="demo-label">Prévia de artigo agendado · não publicado</span>'
    return '<span class="demo-label">Prévia demonstrativa</span>'


def card(post: dict, now: datetime, demo: bool, *, prefix: str = "", featured: bool = False) -> str:
    url = esc(post_url(post, prefix))
    search = esc(" ".join((post["title"], post["excerpt"], post["category"], " ".join(post["tags"]))))
    metadata = f'<p class="post-meta">{esc(human_date(post["published_at"]))} · {esc(reading_time(post))}</p>'
    content = (f'<span class="category">{esc(post["category"])}</span>{status_note(post, now, demo)}'
               f'<h2><a class="{"featured-title" if featured else "post-title"}" href="{url}">{esc(post["title"])}</a></h2>'
               f'{metadata}<p class="excerpt">{esc(post["excerpt"])}</p>'
               f'<a class="read-link" href="{url}">Ler artigo <span aria-hidden="true">↗</span></a>')
    if featured:
        return (f'<article class="featured-post" data-category="{esc(post["category"])}" data-search="{search}">'
                '<a class="featured-image" href="' + url + '"><img src="./assets/fundador.webp" alt="Fábio Schnorr, fundador do escritório" width="900" height="600" loading="lazy"></a>'
                f'<div class="featured-content">{content}</div></article>')
    return f'<article class="post-card" data-category="{esc(post["category"])}" data-search="{search}">{content}</article>'


def write_xml(path: Path, root: ET.Element):
    ET.ElementTree(root).write(path, encoding="utf-8", xml_declaration=True)


def write_feeds(output: Path, config: dict, posts: list[dict], demo: bool, now: datetime):
    real_posts = [] if demo else posts
    rss = ET.Element("rss", version="2.0")
    channel = ET.SubElement(rss, "channel")
    for name, text in (("title", config["site_title"]), ("link", config["site_url"] + "/"), ("description", config["site_description"]), ("language", "pt-BR")):
        ET.SubElement(channel, name).text = text
    ET.SubElement(channel, "lastBuildDate").text = email.utils.format_datetime(now.astimezone(timezone.utc), usegmt=True)
    for post in real_posts[:30]:
        item = ET.SubElement(channel, "item")
        url = f"{config['site_url']}/artigos/{post['slug']}/"
        for name, text in (("title", post["title"]), ("link", url), ("guid", url), ("description", post["excerpt"]), ("category", post["category"]), ("pubDate", email.utils.format_datetime(parse_date(post["published_at"]).astimezone(timezone.utc), usegmt=True))):
            ET.SubElement(item, name).text = text
    write_xml(output / "feed.xml", rss)
    namespace = "http://www.sitemaps.org/schemas/sitemap/0.9"
    ET.register_namespace("", namespace)
    sitemap = ET.Element(f"{{{namespace}}}urlset")
    if not demo:
        home = ET.SubElement(sitemap, f"{{{namespace}}}url")
        ET.SubElement(home, f"{{{namespace}}}loc").text = config["site_url"] + "/"
    for post in real_posts:
        node = ET.SubElement(sitemap, f"{{{namespace}}}url")
        ET.SubElement(node, f"{{{namespace}}}loc").text = f"{config['site_url']}/artigos/{post['slug']}/"
        ET.SubElement(node, f"{{{namespace}}}lastmod").text = post.get("reviewed_at", post["published_at"])
    write_xml(output / "sitemap.xml", sitemap)


def build(project_root: Path = PROJECT_ROOT, output_dir: Path | None = None, *, demo: bool = False, now: datetime | None = None) -> dict:
    project_root = Path(project_root).resolve()
    output = Path(output_dir or project_root / "dist").resolve()
    if output == project_root or output in project_root.parents:
        raise ValidationError("O destino da geração não pode ser a raiz do projeto ou um diretório ancestral.")
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None or now.utcoffset() is None:
        raise ValidationError("O instante de geração precisa conter fuso horário.")
    config = validate_config(read_json(project_root / "blog.config.json"))
    posts = [post for post in load_articles(project_root / "content") if eligible(post, now, demo)]
    try:
        templates = {name: (project_root / "templates" / f"{name}.html").read_text(encoding="utf-8") for name in ("index", "article")}
    except OSError as error:
        raise ValidationError(f"Template obrigatório ausente: {error.filename}.") from error
    # dist é inteiramente gerado; a limpeza impede a permanência de rascunhos publicados em uma prévia anterior.
    if output.exists():
        if any(output.iterdir()) and not (output / ".schnorr-generated").is_file():
            raise ValidationError("O destino já contém arquivos não identificados como gerados pelo blog; escolha uma pasta vazia.")
        shutil.rmtree(output)
    output.mkdir(parents=True)
    (output / ".schnorr-generated").write_text("Diretório gerado por scripts/build.py.\n", encoding="utf-8")
    assets = project_root / "assets"
    if assets.is_dir():
        shutil.copytree(assets, output / "assets")
    robots = "noindex, nofollow" if demo else "index, follow"
    banner = ('<aside class="build-banner" role="note">PRÉVIA DEMONSTRATIVA — inclui rascunhos editoriais não publicados. Este conteúdo não constitui orientação jurídica.</aside>' if demo else "")
    common = {"TITLE": esc(config["site_title"]), "DESCRIPTION": esc(config["site_description"]), "CANONICAL": esc(config["site_url"] + "/"), "ASSET_PREFIX": "./", "ROBOTS": robots, "BUILD_BANNER": banner}
    categories = sorted({post["category"] for post in posts}, key=str.casefold)
    chips = '<button class="filter-chip active" type="button" data-category="all" aria-pressed="true">Todos</button>' + "".join(f'<button class="filter-chip" type="button" data-category="{esc(category)}" aria-pressed="false">{esc(category)}</button>' for category in categories)
    empty = '<p class="empty-state">Novos artigos serão publicados aqui. Conheça também a atuação do <a href="' + esc(config["institutional_url"]) + '">Schnorr & Advogados Associados</a>.</p>'
    values = dict(common, CATEGORIES_HTML=chips, FEATURED_HTML=card(posts[0], now, demo, featured=True) if posts else "", POSTS_HTML="".join(card(post, now, demo) for post in posts) if posts else empty,
                  DATA_JSON=safe_json([{key: post[key] for key in ("title", "excerpt", "category", "slug")} | {"url": post_url(post)} for post in posts]))
    (output / "index.html").write_text(apply_template(templates["index"], values), encoding="utf-8")
    for post in posts:
        folder = output / "artigos" / post["slug"]
        folder.mkdir(parents=True)
        sources = ('<ul>' + "".join(f'<li><a href="{esc(source["url"])}" target="_blank" rel="noopener noreferrer">{esc(source["title"])}</a></li>' for source in post["sources"]) + '</ul>') if post["sources"] else '<p class="sources-note">Rascunho demonstrativo; fontes serão definidas na revisão editorial antes de eventual publicação.</p>'
        related = [other for other in posts if other["slug"] != post["slug"]]
        related.sort(key=lambda other: other["category"] != post["category"])
        schema = {"@context": "https://schema.org", "@type": "Article", "headline": post["title"], "description": post["excerpt"], "datePublished": post["published_at"], "dateModified": post.get("reviewed_at", post["published_at"]), "author": {"@type": "Organization", "name": post["author"]}, "publisher": {"@type": "Organization", "name": "Schnorr & Advogados Associados"}, "mainEntityOfPage": f"{config['site_url']}/artigos/{post['slug']}/"} if not demo else None
        values = dict(common, TITLE=esc(post["title"] + " | Schnorr"), DESCRIPTION=esc(post["excerpt"]), CANONICAL=esc(f"{config['site_url']}/artigos/{post['slug']}/"), ASSET_PREFIX="../../", ARTICLE_TITLE=esc(post["title"]), EXCERPT=esc(post["excerpt"]), AUTHOR=esc(post["author"]), PUBLISH_DATE=esc(human_date(post["published_at"])), UPDATED_DATE=esc("Revisado em " + human_date(post["reviewed_at"])) if "reviewed_at" in post else "", READING_TIME=esc(reading_time(post)), CATEGORY=esc(post["category"]), BODY_HTML=render_markdown(post["body"]), SOURCES_HTML=sources, RELATED_HTML="".join(card(other, now, demo, prefix="../../") for other in related[:3]), SCHEMA_JSON=safe_json(schema), BUILD_BANNER=banner + status_note(post, now, demo))
        (folder / "index.html").write_text(apply_template(templates["article"], values), encoding="utf-8")
    write_feeds(output, config, posts, demo, now)
    (output / "robots.txt").write_text("User-agent: *\nDisallow: /\n" if demo else f"User-agent: *\nAllow: /\nSitemap: {config['site_url']}/sitemap.xml\n", encoding="utf-8")
    (output / "CNAME").write_text(urlsplit(config["site_url"]).hostname + "\n", encoding="utf-8")
    (output / "404.html").write_text('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Página não encontrada | Schnorr</title><h1>Página não encontrada</h1><p>O endereço pode ter mudado.</p><a href="' + esc(config["site_url"]) + '/">Voltar ao blog</a></html>', encoding="utf-8")
    return {"articles": len(posts), "demo": demo, "output": str(output)}


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Gera o blog estático a partir de artigos JSON validados.")
    parser.add_argument("--project-root", type=Path, default=PROJECT_ROOT)
    parser.add_argument("--output-dir", type=Path)
    parser.add_argument("--demo", action="store_true", help="Inclui rascunhos e agendados com aviso explícito e noindex.")
    args = parser.parse_args(argv)
    try:
        result = build(args.project_root, args.output_dir, demo=args.demo)
    except (ValidationError, OSError) as error:
        print(f"Erro na geração: {error}", file=sys.stderr)
        return 1
    print(f"Blog gerado: {result['articles']} artigo(s), modo {'demonstrativo' if result['demo'] else 'produção'}, destino {result['output']}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
