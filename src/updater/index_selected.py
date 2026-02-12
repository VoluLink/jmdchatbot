from __future__ import annotations

import argparse
import hashlib
from pathlib import Path
from typing import Iterable, List

from llama_index.core import Document, SimpleDirectoryReader

from src.config.settings import get_settings
from src.indexing import get_index_manager


def _hash_content(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def _normalize_rel_path(rel_path: str) -> str:
    return rel_path.replace("\\", "/").lstrip("/")


def _collect_target_files(local_data_dir: Path, rel_paths: Iterable[str]) -> List[Path]:
    files: List[Path] = []
    root = local_data_dir.resolve()

    for rel_path in rel_paths:
        clean_rel = _normalize_rel_path(rel_path)
        if not clean_rel:
            continue

        abs_target = (root / clean_rel).resolve()
        try:
            abs_target.relative_to(root)
        except ValueError:
            print(f"Skipping path outside sources dir: {rel_path}")
            continue

        if abs_target.is_file():
            files.append(abs_target)
            continue

        if abs_target.is_dir():
            files.extend([p for p in abs_target.rglob("*") if p.is_file()])
            continue

        print(f"Skipping missing path: {rel_path}")

    # De-duplicate while preserving order
    seen = set()
    unique_files: List[Path] = []
    for file_path in files:
        key = str(file_path)
        if key in seen:
            continue
        seen.add(key)
        unique_files.append(file_path)

    return unique_files


def _load_documents_from_files(files: List[Path]) -> List[Document]:
    if not files:
        return []

    reader = SimpleDirectoryReader(
        input_files=[str(p) for p in files],
        recursive=False,
        filename_as_id=True,
        errors="ignore",
    )

    documents = reader.load_data()
    for doc in documents:
        file_path = doc.metadata.get("file_path", "unknown")
        doc.metadata.update(
            {
                "source": "local",
                "path": file_path,
                "content_hash": _hash_content(doc.text),
                "file_name": doc.metadata.get("file_name", Path(file_path).name),
                "file_type": doc.metadata.get("file_type", Path(file_path).suffix),
            }
        )

    return documents


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Index only selected local files/folders under data/sources."
    )
    parser.add_argument(
        "--path",
        action="append",
        dest="paths",
        default=[],
        help="Relative file/folder path under data/sources. Can be passed multiple times.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Index selected files even if unchanged.",
    )
    args = parser.parse_args()

    settings = get_settings()
    local_data_dir = settings.local_data_dir.resolve()

    if not args.paths:
        print("No --path arguments provided.")
        return

    target_files = _collect_target_files(local_data_dir, args.paths)
    if not target_files:
        print("No valid target files found.")
        return

    print(f"Found {len(target_files)} target file(s).")

    documents = _load_documents_from_files(target_files)
    if not documents:
        print("No readable documents found in targets.")
        return

    index_manager = get_index_manager()
    docs_to_index = documents if args.force else index_manager.get_changed_documents(documents)

    if not docs_to_index:
        print("All selected documents are already up to date.")
        return

    count = index_manager.upsert_documents(docs_to_index)
    print(f"Indexed {count} selected document(s).")


if __name__ == "__main__":
    main()
