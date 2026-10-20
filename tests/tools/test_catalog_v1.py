import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('catalog', Path(__file__).resolve().parents[2] / 'vps/tools/generate_catalog_v1.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class CatalogRules(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rows = module.products()

    def test_exact_additions(self):
        self.assertEqual(len(self.rows), 9938)
        self.assertEqual(62 + len(self.rows), 10000)
        self.assertEqual(len({r['id'] for r in self.rows}), 9938)

    def test_distinct_characteristics(self):
        self.assertEqual(len({(r['config']['family'], r['config']['variant_value'], r['config']['construction'], r['config']['equipment']) for r in self.rows}), 9938)

    def check_range(self, groups, low, high):
        values = [r['price'] for r in self.rows if r['config']['price_group'] in groups]
        self.assertGreater(len(values), 0)
        self.assertTrue(all(low <= p <= high for p in values))

    def test_small_objects(self): self.check_range(['accessoires'], 5, 100)
    def test_clothes_sport(self): self.check_range(['mode', 'sport'], 10, 500)
    def test_furniture(self): self.check_range(['mobilier'], 25, 3000)
    def test_electronics_appliances(self): self.check_range(['tech', 'electromenager'], 20, 3000)

if __name__ == '__main__': unittest.main()