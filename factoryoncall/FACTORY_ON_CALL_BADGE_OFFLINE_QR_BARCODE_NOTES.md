Factory On Call badge print patch

- Removed CDN script dependency from badge print window.
- Badge QR is generated inline as SVG and encodes User ID.
- Badge barcode is generated inline as Code128 SVG and encodes User ID.
- Badge print window calls print after render without waiting for external libraries.
- Badge sheet remains 2 columns by 3 rows per page using letter-size badge dimensions.
- PIN is not encoded on the badge; PIN remains separate and editable.
