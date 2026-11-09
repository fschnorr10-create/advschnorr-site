"""Verificações de segurança editorial, ingestão e publicação estática."""
from __future__ import annotations

import json
import sys
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from xml.etree import ElementTree as ET

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts.build import apply_template, build, eligible, safe_json
from scripts.markdown_safe import render_markdown
from scripts.models import ValidationError, validate_article
from scripts.publish import publish

NOW = datetime(2026, 11, 9, 12, 0, tzinfo=timezone.utc)


def article(**changes):
    value = {"slug": "artigo-teste", "title": "Título do artigo", "excerpt": "Resumo claro para o leitor.", "category": "Empresarial", "author": "Redação Schnorr", "published_at": "2026-11-09T08:00:00-03:00", "status": "published", "body": "## Perguntas\n\nUma reflexão.\n\n- Primeiro ponto\n- Segundo ponto", "sources": [{"title": "Fonte de referência", "url": "https://example.org/referencia"}]}
    value.update(changes)
    return value


class ValidationTests(unittest.TestCase):
    def test_rejects_path_traversal_and_reserved_slug(self):
        for slug in ("../segredo", "a/b", "a\\b", "a%2fb", "/tmp/x", "index", "Nome", "a--b"):
            with self.subTest(slug=slug), self.assertRaises(ValidationError):
                validate_article(article(slug=slug))

    def test_rejects_naive_dates_and_invalid_status(self):
        for changes in ({"published_at": "2026-11-09T08:00:00"}, {"status": "approved"}, {"reviewed_at": "ontem"}):
            with self.subTest(changes=changes), self.assertRaises(ValidationError):
                validate_article(article(**changes))

    def test_sources_require_safe_https_and_publication_evidence(self):
        for url in ("javascript:alert(1)", "http://example.com", "https://u:p@example.com", "https://example.com/\npath", "https://example.com:8080"):
            with self.subTest(url=url), self.assertRaises(ValidationError):
                validate_article(article(sources=[{"title": "Fonte", "url": url}]))
        with self.assertRaises(ValidationError):
            validate_article(article(sources=[]))
        self.assertEqual(validate_article(article(status="draft", sources=[]))["sources"], [])

    def test_production_hides_draft_and_future(self):
        self.assertTrue(eligible(validate_article(article()), NOW))
        self.assertFalse(eligible(validate_article(article(status="draft")), NOW))
        self.assertFalse(eligible(validate_article(article(published_at="2026-11-09T10:00:00-03:00")), NOW))
        self.assertTrue(eligible(validate_article(article(published_at="2026-11-09T12:00:00Z")), NOW))
        self.assertTrue(eligible(validate_article(article(status="draft")), NOW, demo=True))

    def test_markdown_escapes_html_and_unsafe_links(self):
        output = render_markdown('## <script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n[perigo](javascript:alert)\n\n[seguro](https://example.org/?q=%22)\n\n- Item\n\n### Subtítulo')
        self.assertNotIn("<script>", output)
        self.assertNotIn("<img ", output)
        self.assertNotIn('href="javascript:', output)
        self.assertIn("&lt;script&gt;", output)
        self.assertIn('rel="noopener noreferrer"', output)
        self.assertIn("<ul>", output)
        self.assertIn("<h3>Subtítulo</h3>", output)

    def test_safe_json_cannot_close_script(self):
        payload = {"title": "</script><script>alert(1)</script>&\u2028\u2029"}
        output = safe_json(payload)
        self.assertNotIn("<", output)
        self.assertNotIn("\u2028", output)
        self.assertEqual(json.loads(output), payload)

    def test_unknown_template_tokens_fail_clearly(self):
        with self.assertRaisesRegex(ValidationError, "SEM_VALOR"):
            apply_template("<p>@@SEM_VALOR@@</p>", {})


class PublishTests(unittest.TestCase):
    def test_atomic_create_requires_explicit_replace(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / "input.json"
            source.write_text(json.dumps(article()), encoding="utf-8")
            destination = publish(source, root / "content")
            with self.assertRaises(ValidationError):
                publish(source, root / "content")
            updated = article(title="Título revisado")
            source.write_text(json.dumps(updated), encoding="utf-8")
            publish(source, root / "content", replace=True)
            self.assertEqual(json.loads(destination.read_text())["title"], "Título revisado")
            self.assertEqual(list((root / "content").glob("*.tmp")), [])

    def test_symlink_destination_does_not_modify_outside_file(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / "input.json"
            source.write_text(json.dumps(article()))
            content = root / "content"
            content.mkdir()
            outside = root / "outside.json"
            outside.write_text("original")
            (content / "artigo-teste.json").symlink_to(outside)
            with self.assertRaises(ValidationError):
                publish(source, content, replace=True)
            self.assertEqual(outside.read_text(), "original")


class BuildTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name) / "project"
        self.root.mkdir()
        for name in ("content", "templates", "assets"):
            (self.root / name).mkdir()
        (self.root / "assets" / "site.css").write_text("body{}")
        (self.root / "blog.config.json").write_text(json.dumps({"site_url": "https://blog.advschnorr.com.br", "institutional_url": "https://advschnorr.com.br"}))
        home = '<html><head><meta name="robots" content="@@ROBOTS@@"><title>@@TITLE@@</title></head><body>@@BUILD_BANNER@@@@CATEGORIES_HTML@@@@FEATURED_HTML@@@@POSTS_HTML@@<script type="application/json">@@DATA_JSON@@</script></body></html>'
        detail = '<html><meta name="robots" content="@@ROBOTS@@"><body>@@BUILD_BANNER@@<h1>@@ARTICLE_TITLE@@</h1>@@BODY_HTML@@@@SOURCES_HTML@@@@RELATED_HTML@@<script type="application/ld+json">@@SCHEMA_JSON@@</script></body></html>'
        (self.root / "templates" / "index.html").write_text(home)
        (self.root / "templates" / "article.html").write_text(detail)

    def add_post(self, post):
        (self.root / "content" / (post["slug"] + ".json")).write_text(json.dumps(post), encoding="utf-8")

    def test_production_outputs_only_eligible_posts_with_safe_data(self):
        self.add_post(article(title="</script><script>alert(1)</script>"))
        self.add_post(article(slug="rascunho", status="draft", sources=[]))
        self.add_post(article(slug="agendado", published_at="2027-01-01T00:00:00Z"))
        result = build(self.root, now=NOW)
        dist = self.root / "dist"
        self.assertEqual(result["articles"], 1)
        self.assertTrue((dist / "artigos/artigo-teste/index.html").is_file())
        self.assertFalse((dist / "artigos/rascunho").exists())
        self.assertFalse((dist / "artigos/agendado").exists())
        home = (dist / "index.html").read_text()
        self.assertIn("&lt;/script&gt;", home)
        self.assertIn("\\u003c/script\\u003e", home)
        self.assertNotIn("<script>alert(1)", home)
        self.assertEqual((dist / "assets/site.css").read_text(), "body{}")
        self.assertEqual((dist / "CNAME").read_text(), "blog.advschnorr.com.br\n")
        self.assertIn("Sitemap:", (dist / "robots.txt").read_text())
        self.assertEqual(len(ET.parse(dist / "feed.xml").findall("./channel/item")), 1)
        self.assertEqual(len(ET.parse(dist / "sitemap.xml").getroot()), 2)

    def test_demo_is_labeled_noindex_and_does_not_syndicate_drafts(self):
        self.add_post(article(status="draft", sources=[]))
        build(self.root, demo=True, now=NOW)
        dist = self.root / "dist"
        for path in (dist / "index.html", dist / "artigos/artigo-teste/index.html"):
            text = path.read_text()
            self.assertIn("noindex, nofollow", text)
            self.assertIn("Rascunho demonstrativo", text)
            self.assertIn("PRÉVIA DEMONSTRATIVA", text)
        self.assertIn("Disallow: /", (dist / "robots.txt").read_text())
        self.assertEqual(len(ET.parse(dist / "feed.xml").findall("./channel/item")), 0)
        self.assertEqual(len(ET.parse(dist / "sitemap.xml").getroot()), 0)
        # Regerar em produção também remove páginas antigas da prévia.
        build(self.root, now=NOW)
        self.assertFalse((dist / "artigos/artigo-teste").exists())

    def test_existing_unrelated_directory_is_not_deleted(self):
        destination = self.root / "unrelated"
        destination.mkdir()
        (destination / "keep.txt").write_text("preservar")
        with self.assertRaises(ValidationError):
            build(self.root, destination, now=NOW)
        self.assertEqual((destination / "keep.txt").read_text(), "preservar")


if __name__ == "__main__":
    unittest.main()
