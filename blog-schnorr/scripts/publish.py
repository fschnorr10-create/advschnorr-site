#!/usr/bin/env python3
"""Valida e grava artigos JSON atomicamente; não envia dados a serviços externos."""
from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile
from pathlib import Path

try:
    from .build import PROJECT_ROOT, read_json
    from .models import ValidationError, validate_article
except ImportError:
    from build import PROJECT_ROOT, read_json
    from models import ValidationError, validate_article


def publish(input_path: Path, content_dir: Path = PROJECT_ROOT / "content", *, replace: bool = False) -> Path:
    article = validate_article(read_json(Path(input_path)))
    content_dir = Path(content_dir).resolve()
    content_dir.mkdir(parents=True, exist_ok=True)
    destination = content_dir / f"{article['slug']}.json"
    if destination.parent != content_dir or destination.is_symlink():
        raise ValidationError("O destino do artigo não é um arquivo seguro na pasta de conteúdo.")
    if destination.exists() and not replace:
        raise ValidationError(f"{destination.name} já existe. Use --replace para substituí-lo explicitamente.")
    if destination.exists() and not destination.is_file():
        raise ValidationError("O destino do artigo precisa ser um arquivo regular.")
    temporary_path = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=content_dir, prefix=".article-", suffix=".tmp", delete=False) as handle:
            temporary_path = Path(handle.name)
            json.dump(article, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        if replace:
            os.replace(temporary_path, destination)
        else:
            # A criação do link é atômica e falha se outro processo já criou o slug.
            os.link(temporary_path, destination)
    except FileExistsError as error:
        raise ValidationError(f"{destination.name} já existe; nenhuma substituição foi realizada.") from error
    finally:
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)
    return destination


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Valida e inclui um artigo no repositório local do blog.")
    parser.add_argument("--input", required=True, type=Path, help="Arquivo JSON com o artigo completo.")
    parser.add_argument("--content-dir", type=Path, default=PROJECT_ROOT / "content")
    parser.add_argument("--replace", action="store_true", help="Autoriza substituir o artigo com o mesmo slug.")
    args = parser.parse_args(argv)
    try:
        destination = publish(args.input, args.content_dir, replace=args.replace)
    except (ValidationError, OSError) as error:
        print(f"Erro ao preparar artigo: {error}", file=sys.stderr)
        return 1
    print(f"Artigo validado e salvo: {destination}. Faça commit no repositório para acionar a publicação configurada.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
