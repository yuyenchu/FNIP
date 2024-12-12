# Financial News Impact Plugin (FNIP)

A Chrome extension that helps investors analyze financial news articles by providing sentiment analysis and stock ticker identification.

##
Demo: https://mediaspace.illinois.edu/media/t/1_pi6dtvtz

## Features

- **Sentiment Analysis**: Analyzes the emotional tone and potential market impact of financial news articles using AI
- **Stock Ticker Detection**: Automatically identifies stock ticker symbols mentioned in articles
- **Multi-Source Support**: Works across major financial news sites including:
  - Yahoo Finance
  - Reuters
  - Bloomberg
  - CNBC
  - Wall Street Journal
  - Financial Times
  - MarketWatch
  - And more...
- **Context Menu Integration**: Easy access to analysis tools through right-click menu
- **History Tracking**: Saves analysis history for future reference
- **Configurable AI Models**: Choose between different LLM providers for sentiment analysis

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory

## Configuration

1. Click the extension icon in your browser toolbar
2. Enter your API key in the settings
3. Select your preferred LLM provider (HuggingFace or GPT)

## Usage

1. Navigate to any supported financial news website
2. Right-click on an article or highlight specific text
3. Select "FNIP" from the context menu to analyze the content
4. View sentiment analysis results and detected stock tickers

## Supported News Sources

- Yahoo Finance
- Apple Newsroom
- Reuters
- Investors.com
- Bloomberg
- CNBC
- Wall Street Journal
- Financial Times
- MarketWatch
- Forbes
- CNN Business
- The Economist
- Investing.com
- TheStreet
- Money Morning
- This Is Money

## Technical Details

- Built with Manifest V3
- Uses modern JavaScript modules
- Implements chrome.storage for data persistence
- Leverages chrome.contextMenus for user interaction
- Integrates with external AI APIs for sentiment analysis

## Privacy

The extension only processes content from supported financial news websites and does not collect personal data. All analysis history is stored locally in your browser.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the MIT License.
