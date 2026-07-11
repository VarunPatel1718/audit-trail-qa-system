import re
from dataclasses import dataclass
from pathlib import Path

import pdfplumber

# Footnotes and citation superscripts render below this point size in all
# three source Master Direction PDFs (body text is 10-12pt); filtering them
# out before line reconstruction avoids false clause-boundary matches, e.g.
# a footnote line like "22 Amended vide circular ..." being mistaken for a
# numbered clause "22".
BODY_FONT_SIZE_THRESHOLD = 9.5

_CHAPTER_RE = re.compile(r"^chapter\s+([ivxlcdm]+)\b\s*(.*)$", re.IGNORECASE)
_CLAUSE_RE = re.compile(r"^(\d{1,2}(?:\.\d{1,3}){0,4})\.?\s+(\S.*)$")
_TOC_MARKERS = {"contents", "table of contents"}
# Dot-leader TOC entries ("Chapter VII ... 49") extract as a heading followed
# by a bare page number; a page made up mostly of such lines is a table of
# contents even without a "Contents" heading on it (e.g. a TOC listing that
# spills onto a second page).
_TRAILING_PAGE_NUM_RE = re.compile(r"\s\d{1,3}$")
_TOC_TRAILING_NUM_RATIO = 0.5


@dataclass
class PolicyChunk:
    document_name: str
    title: str
    chapter: str | None
    clause_ref: str | None
    content: str
    source_page: int


def _is_toc_page(page_lines: list[str]) -> bool:
    if any(line.strip().lower() in _TOC_MARKERS for line in page_lines):
        return True
    if len(page_lines) < 4:
        return False
    trailing_num_count = sum(1 for line in page_lines if _TRAILING_PAGE_NUM_RE.search(line))
    return (trailing_num_count / len(page_lines)) >= _TOC_TRAILING_NUM_RATIO


def _extract_body_lines(pdf_path: Path) -> list[tuple[int, str]]:
    """Return (page_number, line_text) pairs with footnotes stripped and TOC pages skipped."""
    lines: list[tuple[int, str]] = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            body_only = page.filter(
                lambda obj: obj["object_type"] != "char" or obj.get("size", 0) >= BODY_FONT_SIZE_THRESHOLD
            )
            text = body_only.extract_text() or ""
            page_lines = [ln.strip() for ln in text.split("\n") if ln.strip()]
            if _is_toc_page(page_lines):
                continue
            lines.extend((page.page_number, ln) for ln in page_lines)
    return lines


def _drop_repealed_circulars_appendix(lines: list[tuple[int, str]]) -> list[tuple[int, str]]:
    """Drop the trailing "Appendix: List of Circulars Repealed" table.

    All three source Master Directions end with a boilerplate table of old
    circular numbers/dates rather than policy content; its short, keyword-
    dense rows (bare digits, circular numbers) otherwise fragment into noisy
    clause-like chunks that crowd out real answers in search results.
    """
    for i, (_, line) in enumerate(lines):
        if line.strip().lower() == "appendix":
            return lines[:i]
    return lines


def chunk_policy_pdf(pdf_path: Path, document_title: str) -> list[PolicyChunk]:
    """Chunk a policy PDF by its chapter/clause structure instead of fixed-size splitting.

    Each chunk is one numbered clause (e.g. "4.1.5") plus its body text up to
    the next clause or chapter boundary, tagged with the chapter and clause
    reference it belongs to.
    """
    lines = _extract_body_lines(pdf_path)
    lines = _drop_repealed_circulars_appendix(lines)

    chunks: list[PolicyChunk] = []
    current_chapter: str | None = None
    current_clause: str | None = None
    current_page: int | None = None
    pending_chapter_label: str | None = None
    buffer: list[str] = []

    def flush() -> None:
        nonlocal buffer, current_page
        content = " ".join(buffer).strip()
        if content:
            chunks.append(
                PolicyChunk(
                    document_name=pdf_path.name,
                    title=document_title,
                    chapter=current_chapter,
                    clause_ref=current_clause,
                    content=content,
                    source_page=current_page or 1,
                )
            )
        buffer = []
        current_page = None

    for page_num, line in lines:
        chapter_match = _CHAPTER_RE.match(line)
        if chapter_match:
            flush()
            roman = chapter_match.group(1).upper()
            trailing_title = chapter_match.group(2).strip()
            if trailing_title:
                current_chapter = f"Chapter {roman}: {trailing_title}"
                pending_chapter_label = None
            else:
                current_chapter = f"Chapter {roman}"
                pending_chapter_label = current_chapter
            current_clause = None
            continue

        clause_match = _CLAUSE_RE.match(line)
        if clause_match:
            flush()
            current_clause = clause_match.group(1)
            pending_chapter_label = None
            current_page = page_num
            buffer.append(line)
            continue

        if pending_chapter_label is not None:
            # The first non-clause line right after a bare "Chapter N" marker
            # is that chapter's title (e.g. "PRELIMINARY"), not body text.
            current_chapter = f"{pending_chapter_label}: {line}"
            pending_chapter_label = None
            continue

        if current_page is None:
            current_page = page_num
        buffer.append(line)

    flush()
    return _dedupe_clauses(chunks)


def _dedupe_clauses(chunks: list[PolicyChunk]) -> list[PolicyChunk]:
    """Collapse duplicate (chapter, clause_ref) chunks, keeping the longest content.

    The fraud-risk Master Directions restate every clause heading once in
    their table of contents (heading only, no body) and again at the real
    clause (heading + full body); a page-level TOC skip isn't reliable since
    the listing can spill onto a following page with no "Contents" marker on
    it. Keyed on (chapter, clause_ref) rather than clause_ref alone so clause
    numbers that legitimately restart in a new chapter aren't merged together.
    """
    deduped: list[PolicyChunk] = []
    positions: dict[tuple[str | None, str], int] = {}
    for chunk in chunks:
        if chunk.clause_ref is None:
            deduped.append(chunk)
            continue
        key = (chunk.chapter, chunk.clause_ref)
        if key in positions:
            idx = positions[key]
            if len(chunk.content) > len(deduped[idx].content):
                deduped[idx] = chunk
            continue
        positions[key] = len(deduped)
        deduped.append(chunk)
    return deduped
