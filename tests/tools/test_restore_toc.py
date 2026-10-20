import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location(
    "filter_restore_toc", Path(__file__).parents[2] / "vps/tools/filter_restore_toc.py"
)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class RestoreTocTests(unittest.TestCase):
    def test_scheduler_is_excluded(self):
        for entry in (
            "EXTENSION - pg_cron", "COMMENT - EXTENSION pg_cron",
            "SCHEMA - cron postgres", "ACL - SCHEMA cron postgres",
            "TABLE DATA cron job postgres", "TABLE DATA cron job_run_details postgres",
            "ACL cron job postgres",
        ):
            with self.subTest(entry=entry):
                self.assertTrue(module.filter_toc(f"12; 0 123 {entry}\n").startswith("; excluded"))

    def test_game_and_other_extensions_are_preserved(self):
        for entry in (
            "EXTENSION - pgcrypto", "TABLE DATA public characters postgres",
            "TABLE public cron postgres", "ACL public characters postgres",
            "FUNCTION public cron() postgres", "COMMENT - DATABASE civitas postgres",
        ):
            with self.subTest(entry=entry):
                line = f"15; 0 456 {entry}\n"
                self.assertEqual(module.filter_toc(line), line)

    def test_headers_are_preserved(self):
        self.assertEqual(module.filter_toc("; archive header\n\n"), "; archive header\n\n")


if __name__ == "__main__":
    unittest.main()