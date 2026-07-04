# Zotero Root PDF Matcher

A Zotero plugin that automatically matches and attaches local PDFs to items in your library based on DOI matching.

## Features

- **Automatic PDF Matching**: Matches PDFs in a local folder hierarchy to Zotero items using DOI identifiers
- **Efficient Caching**: Builds and caches a DOI-to-file map for fast subsequent matches
- **Configurable Root Path**: Set any folder as the root for PDF scanning
- **Adjustable Scan Depth**: Control how deep the plugin scans subdirectories
- **History Tracking**: View recent matching operations with summary statistics
- **Diagnostics**: Quick diagnostic tool to verify plugin configuration
- **Batch Attachment**: Attach multiple PDFs in one operation

## Installation

### From Release
1. Download the latest `.xpi` file from [Releases](https://github.com/fdossi/Zotero-Root-PDF-Matcher/releases)
2. In Zotero, go to **Tools → Add-ons**
3. Click the gear icon and select **Install Add-on from File...**
4. Select the downloaded `.xpi` file

### Manual Development Install
1. Clone this repository:
   ```bash
   git clone https://github.com/fdossi/Zotero-Root-PDF-Matcher.git
   ```
2. In Zotero, create a proxy entry for development:
   - Open your Zotero profile folder
   - Navigate to `extensions` directory
   - Create a file named `zotero-root-pdf-matcher@fabio.dev` (no extension)
   - Add the full path to the repository folder (one line, no trailing newline)

## Usage

### Initial Setup
1. Open Zotero and select one or more items with DOI fields
2. Go to **Tools → Matcher de PDFs → Definir pasta raiz de PDFs**
3. Select the root folder containing your PDF files
4. The plugin will scan subdirectories to build a cache

### Running Matches
1. Select one or more Zotero items with DOI values
2. Go to **Tools → Matcher de PDFs → Anexar PDFs por DOI**
3. The plugin scans for matching PDFs and attaches them to items
4. A summary dialog shows results (attached, not found, failed)

### Other Operations
- **Reindex Cache**: Rebuild the PDF-to-DOI mapping (use after adding/moving files)
- **Clear Cache**: Remove the cached mapping (useful if performance degrades)
- **Recent History**: View last 10 matching operations
- **Diagnostic**: Quick check of plugin configuration and cache state

## Configuration

The plugin stores preferences in Zotero's settings:

- `extensions.zoteroRootPdfMatcher.rootPath`: Path to your PDF root folder
- `extensions.zoteroRootPdfMatcher.scanMaxDepth`: Maximum directory depth to scan (default: 5)
- `extensions.zoteroRootPdfMatcher.confirmBeforeFullScan`: Ask before scanning many directories

## How It Works

### DOI Extraction
The plugin identifies DOIs in PDF file names and metadata using this pattern:
```
10.\d{4,9}/[\-._;()/:A-Z0-9]+
```

For example:
- `10.1234/example.pdf` → DOI: `10.1234/example`
- `Smith2023_10.1234/test.pdf` → DOI: `10.1234/test`

### Matching Algorithm
1. Collects all DOIs from selected Zotero items
2. Checks cache first for known file paths
3. For uncached DOIs, scans the PDF root folder
4. Extracts DOIs from PDF file names and metadata headers
5. Attaches found matches to corresponding items

### Performance
- Caching prevents repeated file system scans
- Respects user-configured scan depth limits
- Batch operations improve efficiency over individual attachments

## Troubleshooting

### "Could not be installed. It may be incompatible with this version of Zotero."
- Ensure your Zotero version is 7.0 or later
- Check the plugin's version compatibility in manifest.json

### PDFs not being found
- Verify DOIs are present in Zotero item records (not just file names)
- Use **Diagnostic** to confirm root path is set correctly
- Run **Reindex Cache** to rebuild the mapping
- Check that PDF files are readable and not in hidden folders

### Performance issues
- Reduce `scanMaxDepth` to avoid deep directory traversals
- Clear cache if it grows too large
- Consider organizing PDFs in a shallower structure

## Development

### Project Structure
```
bootstrap.js      - Main plugin logic and lifecycle hooks
manifest.json     - Plugin metadata and compatibility info
icon.svg          - Plugin icon
```

### Building
Create a `.xpi` file:
```bash
# Windows PowerShell
Compress-Archive -Path manifest.json,bootstrap.js -DestinationPath plugin.zip -CompressionLevel Optimal
Rename-Item plugin.zip plugin.xpi

# Linux/macOS
zip -r plugin.xpi manifest.json bootstrap.js
```

### Compatibility
- **Minimum**: Zotero 7.0
- **Tested up to**: Zotero 9.999.*

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request with clear description of changes

## Issues

Found a bug or have a feature request? Please open an issue on [GitHub Issues](https://github.com/fdossi/Zotero-Root-PDF-Matcher/issues).

## Changelog

### v1.1.2 (2026-07-03)
- Initial release
- Automatic PDF matching by DOI
- Caching and history tracking
- Diagnostic tools

## Author

Created by [fdossi](https://github.com/fdossi)

## Acknowledgments

- Based on [Zotero plugin development guide](https://www.zotero.org/support/dev/zotero_7_for_developers)
- Inspired by community requests for automated PDF attachment
