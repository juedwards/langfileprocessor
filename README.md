# Language Analyser

A web-based tool for analyzing the readability of text content in Minecraft Education world files (.mcworld) and template files (.mctemplate).

## Features

### File Processing
- **Supports multiple formats**: .mcworld and .mctemplate files
- **ZIP extraction**: Automatically unzips and analyzes archive contents
- **Language file detection**: Finds all .lang files within the archive structure
- **Text extraction**: Cleans and processes readable text from language files

### Text Analysis
- **Advanced text cleaning**: Removes Minecraft formatting codes, metadata, and special characters
- **Natural language filtering**: Extracts only meaningful text that players would actually read
- **Largest file identification**: Automatically finds and analyzes the most substantial language file

### Readability Metrics
Calculates seven classic readability formulas:
- **Flesch Reading Ease** (0-100 scale, higher = easier)
- **Flesch-Kincaid Grade Level** (US school grade equivalent)
- **Gunning Fog Index** (years of education required)
- **SMOG Index** (Simple Measure of Gobbledygook)
- **Coleman-Liau Index** (character-based analysis)
- **Automated Readability Index** (computer-optimized formula)
- **Linsear Write Formula** (designed for technical documents)

### Visual Analysis
- **Interactive charts**: Bar chart visualization of readability scores
- **Statistical dashboard**: Key metrics including word count, sentence count, and complex words
- **Educational recommendations**: Age-appropriate guidance for content usage

### Export Options
- **Download extracted text**: Save cleaned text as .txt file
- **Download full analysis**: Comprehensive report with all metrics and recommendations

## How to Use

1. **Upload File**: Drag and drop or click to select a .mcworld or .mctemplate file
2. **Processing**: The tool automatically extracts and analyzes language files
3. **Review Results**: Examine readability scores and educational recommendations
4. **Export Data**: Download text or full analysis report as needed

## Technical Details

### Browser Requirements
- Modern web browser with JavaScript enabled
- Support for File API and ZIP processing
- No server-side processing required

### Dependencies
- JSZip library for archive processing
- Chart.js for data visualization
- All dependencies loaded from CDN

### File Structure Analysis
The tool processes Minecraft Education files by:
1. Extracting all files from the ZIP archive
2. Identifying .lang files in any subdirectory
3. Finding the largest language file (typically en_US.lang)
4. Cleaning text to remove game-specific formatting
5. Calculating readability metrics on the cleaned text

## Educational Context

This tool helps educators assess whether their Minecraft Education content is appropriate for their target audience. The readability analysis provides guidance on:

- **Grade level appropriateness**: Determine if content matches student reading levels
- **Age recommendations**: Specific age ranges for optimal comprehension
- **Educational planning**: Align content difficulty with curriculum standards
- **Accessibility**: Ensure content is accessible to diverse learners

## Privacy and Security

- **Client-side processing**: All file analysis happens in your browser
- **No data transmission**: Files are not uploaded to any server
- **No data storage**: No information is saved or tracked
- **Offline capable**: Works without internet after initial page load

## Browser Compatibility

Tested and supported on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

This project is open source and available for educational use.

## Contributing

This tool was developed to support educators using Minecraft Education Edition. Feedback and suggestions for improvements are welcome.

## Technical Implementation

The application uses vanilla JavaScript with modern web APIs:
- File API for file handling
- Web Workers compatibility for processing
- Canvas API for chart rendering
- CSS Grid and Flexbox for responsive layout

The Minecraft-themed interface uses earthy color palettes to match the game's aesthetic while maintaining professional readability standards.
