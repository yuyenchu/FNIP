import { nanoid } from 'https://cdn.jsdelivr.net/npm/nanoid/nanoid.js'
import ticker from './ticker.js'

function findTickers(text) {
    // Improved regex to better match stock tickers and reduce false positives
    // Matches 1-5 uppercase letters that are standalone words or preceded by $ symbol
    const regex = /(\$[A-Z]{1,5}\b|\b[A-Z]{1,5}\b)(?![a-z])/gm;
    
    // Filter out common English words and abbreviations that aren't likely to be tickers
    const commonWords = new Set(['I', 'A', 'AN', 'THE', 'AND', 'OR', 'BUT', 'IF', 'TO', 'FOR', 'IN', 'ON', 'BY', 'AT']);
    
    let matches = text.match(regex) ?? [];
    // Clean up matches by removing $ prefix and filtering out common words
    matches = matches.map(match => match.replace('$', '')).filter(match => !commonWords.has(match));
    
    // Count occurrences
    let count = matches.reduce((accu, curr) => {
        return (
            accu[curr] ? ++accu[curr] : (accu[curr] = 1),
            accu
        );
    }, {});

    return count
}

let ROOT = undefined;
async function addRoot() {
    const settings = (await chrome.storage.local.get(null))['FNIP_SETTINGS'];
    let suffix = '';
    if (!settings?.API_KEY) {
        suffix = ' (API key not set)'
    } else if (settings?.LLM) {
        suffix = ` (${settings.LLM})`
    }
    ROOT = await chrome.contextMenus.create({
        id: 'FRNIP_ROOT',
        title: 'FNIP'+suffix,
        // type: 'normal',
        contexts: ['all'],
    });
    console.log('root id =', ROOT)
}

async function initialize() {
    console.log('initialize')
    const localData = await chrome.storage.local.get(null);
    if (localData['FNIP_HISTORY']===undefined) {
        await chrome.storage.local.set({'FNIP_HISTORY': []});
    }
    if (localData['FNIP_SETTINGS']===undefined) {
        await chrome.storage.local.set({'FNIP_SETTINGS': {API_KEY:'', LLM:'HF'}});
    }
    if (localData['FNIP_FAVORITES']===undefined) {
        await chrome.storage.local.set({'FNIP_FAVORITES': []});
    }
    await addRoot();
}

async function getSentiment(text, id) {
    const settings = (await chrome.storage.local.get(null))['FNIP_SETTINGS'];
    if (settings?.LLM==='GPT'){
        return fetch('https://api.chatanywhere.org/v1/chat/completions', {
            headers: {
                "content-type": "application/json",
                "Authorization": `Bearer ${settings.API_KEY}` // "Bearer sk-5P67sLZnVOArfQMolFskdAFhzvsNKVADNuLu5ieL2m273IYA"
              },
            method: "POST",
            body: JSON.stringify({
                "model": "gpt-4o-mini",
                "messages": [
                    {
                        "role": "system",
                        "content": "Please act as a financial news sentiment analyzer bot, when the article and company name is given, return a \"positive\", \"neutral\", or \"negative\" sentiment label with a zero to one scale sentiment strength score in float, an estimated stock impact time range in unit of days, and a brief reasoning. The answer should be in the following json format:\n{\"label\": \"<sentiment_choice>\"\n\"score\":<strength_score>\n\"impact_time\": <estimated_impact_time>,\n\"reason\":<brief_reasoning>}"      
                    },
                    {
                        "role": "user",
                        "content": `company name:${ticker[id]}\narticle:\n${text}`
                    }
                ]
            })
        }).then((response) => {
            return response.json();
        }).then((response) => {
            let data = response?.choices?.[0]?.message?.content;
            // console.log('gpt data: ',data);
            let ret = data;
            try {
                if (ret.startsWith('```')) {
                    ret = ret.substring(ret.indexOf('{'));
                }
                if (ret.endsWith('```')) {
                    ret = ret.substring(0, ret.lastIndexOf('}')+1);
                }
                ret = [[JSON.parse(ret)]];
            } catch (error) {
                console.error('gpt parsing: ', error, ret);
                return {error};
            }
            return data?ret:response;
        }).catch((err) => {
            console.log('Fetch Error:', err);
            return {err};
        });
    } else if (settings?.LLM==='HF'){
        return fetch('https://api-inference.huggingface.co/models/mrm8488/distilroberta-finetuned-financial-news-sentiment-analysis', {
            headers: {
                "content-type": "application/json",
                "Authorization": `Bearer ${settings.API_KEY}` // "Bearer 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"
              },
            method: "POST",
            body: JSON.stringify({inputs: text})
        }).then((response) => {
            return response.json();
        }).catch((err) => {
            console.log('Fetch Error:', err);
            return {err};
        });
    } else {
        return {error: `LLM backend ${settings?.LLM} is not recognized`}
    }
}

async function getStockPerformance(ticker) {
    try {
        const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=5d`);
        const data = await response.json();
        
        if (!data || !data.chart || !data.chart.result || data.chart.result.length === 0) {
            return { error: 'No data available' };
        }
        
        const result = data.chart.result[0];
        const quote = result.indicators.quote[0];
        const timestamps = result.timestamp;
        const closes = quote.close;
        const volumes = quote.volume;
        
        // Get the most recent valid closing price and the one from 1 and 5 days ago
        let currentPrice = null;
        let oneDayAgoPrice = null;
        let fiveDayAgoPrice = null;
        
        for (let i = closes.length - 1; i >= 0; i--) {
            if (closes[i] !== null && currentPrice === null) {
                currentPrice = closes[i];
            } else if (closes[i] !== null && oneDayAgoPrice === null) {
                oneDayAgoPrice = closes[i];
            } else if (closes[i] !== null && i <= closes.length - 5 && fiveDayAgoPrice === null) {
                fiveDayAgoPrice = closes[i];
                break;
            }
        }
        
        if (!currentPrice) return { error: 'No valid price data' };
        
        // Calculate daily and 5-day performance
        const oneDayPerf = oneDayAgoPrice ? ((currentPrice - oneDayAgoPrice) / oneDayAgoPrice) * 100 : null;
        const fiveDayPerf = fiveDayAgoPrice ? ((currentPrice - fiveDayAgoPrice) / fiveDayAgoPrice) * 100 : null;
        
        return {
            ticker,
            currentPrice: parseFloat(currentPrice.toFixed(2)),
            oneDayPerformance: oneDayPerf ? parseFloat(oneDayPerf.toFixed(2)) : null,
            fiveDayPerformance: fiveDayPerf ? parseFloat(fiveDayPerf.toFixed(2)) : null,
            lastUpdated: new Date().toISOString()
        };
    } catch (error) {
        console.error(`Error fetching stock data for ${ticker}:`, error);
        return { error: 'Failed to fetch stock data' };
    }
}

async function generateReport(id) {
    const text = (await chrome.storage.session.get('text')).text;
    const url = (await chrome.storage.session.get('url')).url;
    const llm = (await chrome.storage.local.get(null)).FNIP_SETTINGS?.LLM;
    const sentiments = await getSentiment(text, id);
    
    // Get real-time stock performance
    const stockPerformance = await getStockPerformance(id);
    
    return {
        uid: nanoid(),
        id: id,
        company: ticker[id],
        timestamp: Date.now(),
        sentiments,
        stockPerformance,
        text,
        url,
        llm,
    }
}

chrome.runtime.onInstalled.addListener(initialize);

chrome.runtime.onMessage.addListener(async function(request, sender, sendResponse) {
    console.log(request);
    if (request.message == 'updateContextMenu') {
        if (request.selection) {
            await chrome.storage.session.set({text: request.text, url: request.url});
            await chrome.contextMenus.removeAll();
            await addRoot();
            let tickers = findTickers(request.text);
            Object.keys(tickers).forEach(async(key) => {
                if (ticker[key] !== undefined) {
                    chrome.contextMenus.create({
                        id: key,
                        title: ticker[key],
                        type: 'normal',
                        contexts: ['all'],
                        parentId: 'FRNIP_ROOT',
                        // enabled: true, 
                        // 'onclick': someFunction
                    });
                }
            });
        }
        // else {
        //     chrome.contextMenus.update('contextMenuId',{
        //         'title': 'Select some text first', 
        //         'enabled': false, 
        //         'contexts': ['all'],
        //     });
        // }
    } else if (request.message == 'triggerSearch') {
        let report = await generateReport(request.ticker);
        console.log(report);
        let history = (await chrome.storage.local.get(null)).FNIP_HISTORY;
        console.log(history);
        history.push(report);
        await chrome.storage.local.set({'FNIP_HISTORY': history});
    } else if (request.message == 'checkTicker') {
        sendResponse({valid:ticker[request.ticker] !== undefined});
    } else {
        sendResponse({});
    }
});

// // Open a new search tab when the user clicks a context menu
chrome.contextMenus.onClicked.addListener(async(item, tab) => {
    // const tld = item.menuItemId;
    // const url = new URL(`https://google.${tld}/search`);
    // url.searchParams.set('q', item.selectionText);
    // chrome.tabs.create({ url: url.href, index: tab.index + 1 });
    let report = await generateReport(item.menuItemId);
    console.log(report);
    let history = (await chrome.storage.local.get(null)).FNIP_HISTORY;
    console.log(history);
    history.push(report);
    await chrome.storage.local.set({'FNIP_HISTORY': history});
});

// // Add or removes the locale from context menu
// // when the user checks or unchecks the locale in the popup
// chrome.storage.onChanged.addListener(({ enabledTlds }) => {
//   if (typeof enabledTlds === 'undefined') return;

//   const allTlds = Object.keys(tldLocales);
//   const currentTlds = new Set(enabledTlds.newValue);
//   const oldTlds = new Set(enabledTlds.oldValue ?? allTlds);
//   const changes = allTlds.map((tld) => ({
//     tld,
//     added: currentTlds.has(tld) && !oldTlds.has(tld),
//     removed: !currentTlds.has(tld) && oldTlds.has(tld)
//   }));

//   for (const { tld, added, removed } of changes) {
//     if (added) {
//       chrome.contextMenus.create({
//         id: tld,
//         title: tldLocales[tld],
//         type: 'normal',
//         contexts: ['selection']
//       });
//     } else if (removed) {
//       chrome.contextMenus.remove(tld);
//     }
//   }
// });

// chrome.tabs.create({url: chrome.extension.getURL('index.html')});
// chrome.storage.local.set({ "phasersTo": "awesome" }, function(){
// });


// chrome.storage.local.getKeys((keys)=>{
//     keys.forEach(async (key)=>{
//         let value = await chrome.storage.local.get(key);
//         document.querySelector.
//     })
// })