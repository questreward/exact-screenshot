"""Exclude only pg_cron and its schema from an isolated restore list."""
import re
import sys

CRON_ENTRY = re.compile(
    r"^(?:EXTENSION - pg_cron(?: |$)"
    r"|(?:COMMENT|ACL) - EXTENSION pg_cron(?: |$)"
    r"|SCHEMA - cron(?: |$)"
    r"|(?:COMMENT|ACL) - SCHEMA cron(?: |$)"
    r"|(?:TABLE DATA|TABLE|SEQUENCE SET|SEQUENCE|FUNCTION|PROCEDURE|TYPE|"
    r"VIEW|MATERIALIZED VIEW DATA|MATERIALIZED VIEW|INDEX|CONSTRAINT|"
    r"FK CONSTRAINT|TRIGGER|DEFAULT|ACL|COMMENT) cron )"
)


def filter_toc(text: str) -> str:
    lines = []
    for line in text.splitlines(keepends=True):
        entry = re.match(r"^\d+;\s+\d+\s+\d+\s+(.*)", line)
        if entry and CRON_ENTRY.match(entry.group(1)):
            line = "; excluded from isolated test: " + line
        lines.append(line)
    return "".join(lines)


if __name__ == "__main__":
    sys.stdout.write(filter_toc(sys.stdin.read()))