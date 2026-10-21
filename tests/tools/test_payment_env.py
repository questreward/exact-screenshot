import base64
import hashlib
import hmac
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("payment_env", Path(__file__).parents[2] / "vps/tools/repair_payment_env.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class PaymentEnvTests(unittest.TestCase):
    def test_repairs_private_key_without_touching_public_key(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / ".env"
            path.write_text("VITE_SUPABASE_PUBLISHABLE_KEY=public-test\nSTRIPE_SECRET_KEY=stripe-test\n")
            module.repair(path, [
                {"Name": "/civitas-auth", "Config": {"Env": ["GOTRUE_JWT_SECRET=fixture-secret"]}},
                {"Name": "/civitas-rest", "Config": {"Env": ["PGRST_JWT_SECRET=fixture-secret"]}},
            ], 1000)
            entries = dict(line.split("=", 1) for line in path.read_text().splitlines())
            self.assertEqual(entries["VITE_SUPABASE_PUBLISHABLE_KEY"], "public-test")
            self.assertEqual(entries["STRIPE_SECRET_KEY"], "stripe-test")
            header, payload, signature = entries["SUPABASE_SERVICE_ROLE_KEY"].split(".")
            claims = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
            self.assertEqual(claims["role"], "service_role")
            expected = base64.urlsafe_b64encode(hmac.new(b"fixture-secret", (header + "." + payload).encode(), hashlib.sha256).digest()).rstrip(b"=").decode()
            self.assertEqual(signature, expected)
            self.assertEqual(path.stat().st_mode & 0o777, 0o600)

    def test_mismatched_services_do_not_modify_file(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / ".env"
            path.write_text("unchanged=yes\n")
            with self.assertRaises(ValueError):
                module.repair(path, [{"Name": "/civitas-auth", "Config": {"Env": ["GOTRUE_JWT_SECRET=fixture"]}}], 1000)
            self.assertEqual(path.read_text(), "unchanged=yes\n")


if __name__ == "__main__":
    unittest.main()