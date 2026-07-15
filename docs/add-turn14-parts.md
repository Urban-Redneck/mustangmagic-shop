# Add Turn14 Parts

Use the local Turn14 export importer when adding specific products to the store.

Normal add-part flow:

```bash
python3 scripts/import_turn14_product_from_export.py PART_NUMBER --full
```

Example:

```bash
python3 scripts/import_turn14_product_from_export.py sct7015PEO --full
```

`--full` does the normal storefront pipeline:

- imports the product from `turn14_items_export.json`
- publishes it to the storefront
- syncs Turn14 pricing
- syncs Turn14 inventory
- syncs Turn14 item data, descriptions, and product images

You can add multiple parts in one run:

```bash
python3 scripts/import_turn14_product_from_export.py sct7015PEO aer12701 --full
```

Partial runs:

```bash
python3 scripts/import_turn14_product_from_export.py PART_NUMBER --publish
python3 scripts/import_turn14_product_from_export.py PART_NUMBER --pricing
python3 scripts/import_turn14_product_from_export.py PART_NUMBER --inventory
python3 scripts/import_turn14_product_from_export.py PART_NUMBER --item-data
```

Preview without writing:

```bash
python3 scripts/import_turn14_product_from_export.py PART_NUMBER --dry-run
```
