"""HTML5 sanitizer; retained CSS cannot fetch resources or execute script.

nh3 handles HTML parsing and malformed markup. The stdlib parser only *extracts*
known generated styles which are reconstructed from a deliberately tiny grammar;
its serialization is never used as sanitized HTML.
"""

import re
from html.parser import HTMLParser
from urllib.parse import urlsplit

import nh3

from app.core.errors import ApiError

STYLE_PROPERTIES = {
    "color",
    "background-color",
    "font-family",
    "font-size",
    "font-weight",
    "font-style",
    "text-align",
    "text-decoration",
    "line-height",
    "letter-spacing",
    "text-transform",
    "margin",
    "margin-top",
    "margin-right",
    "margin-bottom",
    "margin-left",
    "padding",
    "padding-top",
    "padding-right",
    "padding-bottom",
    "padding-left",
    "border",
    "border-width",
    "border-color",
    "border-style",
    "border-radius",
    "display",
    "grid-template-columns",
    "grid-template-rows",
    "grid-column",
    "grid-row",
    "grid-area",
    "gap",
    "row-gap",
    "column-gap",
    "width",
    "min-width",
    "max-width",
    "height",
    "min-height",
    "max-height",
    "align-items",
    "justify-content",
    "flex-wrap",
    "flex-direction",
    "flex",
    "overflow-wrap",
    "white-space",
    "box-sizing",
}


def safe_link(value: str) -> str | None:
    # No control characters, URL credentials, implicit host or browser backslash fixes.
    if (
        not value
        or len(value) > 2048
        or any(ord(c) < 33 or ord(c) == 127 for c in value)
        or "\\" in value
    ):
        return None
    if re.fullmatch(r"#[A-Za-z][A-Za-z0-9_-]{0,99}", value):
        return value
    try:
        parsed = urlsplit(value)
        if (
            parsed.scheme in {"https", "http"}
            and parsed.hostname
            and not parsed.username
            and not parsed.password
        ):
            _ = parsed.port  # reject malformed/out-of-range ports
            return value
        if (
            parsed.scheme == "mailto"
            and re.fullmatch(r"[^@\s?/#]+@[^@\s?/#]+\.[^@\s?/#]+", parsed.path)
            and not parsed.query
            and not parsed.fragment
        ):
            return value
    except ValueError:
        pass
    return None


def safe_image_url(value: str) -> str | None:
    # Solo imágenes por https, sin credenciales ni data:/javascript:. La imagen la pide el
    # navegador de quien mira la página, con referrerpolicy=no-referrer (ver CLEANER).
    link = safe_link(value)
    if link and link.lower().startswith("https://"):
        return link
    return None


def attribute_filter(tag: str, name: str, value: str) -> str | None:
    if name == "href":
        return safe_link(value)
    if name == "src":
        return safe_image_url(value) if tag == "img" else None
    if name == "style":
        # Additional defense for escaped CSS, custom properties, legacy expressions.
        # Safe allowlisted layout/font/color properties do not load resources.
        if re.search(r"url\s*\(|expression\s*\(|@|\\|/\*|--", value, re.I):
            return None
        # Browsers serialize the runtime's numeric gridRow/gridColumn assignments
        # into grid-area. Keep that exact geometry without admitting named areas,
        # arbitrary expressions, huge implicit grids, or priority overrides.
        for placement in re.finditer(r"(?:^|;)\s*grid-area\s*:\s*([^;]*)", value, re.I):
            if not re.fullmatch(
                r"[1-9][0-9]?\s*/\s*[1-9][0-9]?\s*/\s*span\s+[1-9][0-9]?\s*/\s*span\s+[1-9][0-9]?\s*",
                placement[1],
                re.I,
            ):
                return None
    return value


CLEANER = nh3.Cleaner(
    tags={
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "p",
        "div",
        "span",
        "section",
        "article",
        "header",
        "footer",
        "main",
        "nav",
        "ul",
        "ol",
        "li",
        "a",
        "img",
        "br",
        "hr",
        "strong",
        "em",
        "b",
        "i",
        "small",
        "blockquote",
        "pre",
        "code",
        "button",
    },
    clean_content_tags={
        "script",
        "style",
        "iframe",
        "object",
        "embed",
        "svg",
        "math",
        "template",
        "form",
        "textarea",
        "select",
        "noscript",
        "xmp",
        "plaintext",
        "audio",
        "video",
    },
    attributes={
        "*": {"class", "id", "style", "title", "aria-label", "aria-live"},
        "a": {"href"},
        "img": {"alt", "src"},
    },
    set_tag_attribute_values={"img": {"referrerpolicy": "no-referrer", "loading": "lazy"}},
    attribute_filter=attribute_filter,
    filter_style_properties=STYLE_PROPERTIES,
    url_schemes={"http", "https", "mailto"},
    link_rel="noopener noreferrer nofollow",
    strip_comments=True,
)


class GeneratedStyles(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.in_style = False
        self.parts: list[str] = []
        self.blocks: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag == "style":
            self.in_style = True
            self.parts = []

    def handle_data(self, data):
        if self.in_style:
            self.parts.append(data)

    def handle_endtag(self, tag):
        if tag == "style" and self.in_style:
            self.in_style = False
            self.blocks.append("".join(self.parts))


def generated_styles(html: str) -> str:
    parser = GeneratedStyles()
    parser.feed(html)
    output: list[str] = []
    for block in parser.blocks:
        compact = re.sub(r"\s+", "", block).lower()
        if compact == "body{margin:0;padding:0;}html,body{height:100%;}":
            output.append("body{margin:0;padding:0;}html,body{height:100%;}")
            continue
        if compact == "body{padding:0;}":
            output.append("body{padding:0;}")
            continue
        match = re.fullmatch(r":root\s*\{\s*--color-fondo\s*:\s*([^;{}]+)\s*;?\s*\}", block, re.I)
        if match:
            color = match[1].strip().lower()
            if re.fullmatch(
                r"#[0-9a-f]{3,8}|[a-z]{1,24}|(?:rgb|rgba|hsl|hsla)\([0-9.,%\s/+\-deg]+\)", color
            ):
                output.append(":root{--color-fondo:" + color + ";}")
    return "".join("<style>" + value + "</style>" for value in dict.fromkeys(output))


def sanitize_snapshot(html: str) -> str:
    try:
        size = len(html.encode("utf-8"))
    except UnicodeEncodeError:
        raise ApiError(422, "INVALID_SNAPSHOT", "La página contiene texto no válido.") from None
    if size > 500_000:
        raise ApiError(422, "INVALID_SNAPSHOT", "La página es demasiado grande para publicar.")
    clean_content = CLEANER.clean(html)
    clean = generated_styles(html) + clean_content
    if not re.sub(r"<[^>]*>", "", clean_content).strip():
        raise ApiError(
            422, "EMPTY_SNAPSHOT", "La página debe tener contenido visible para publicar."
        )
    return clean
