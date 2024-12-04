import { nanoid } from 'https://cdn.jsdelivr.net/npm/nanoid/nanoid.js'
import ticker from './ticker.js'

function findTickers(text) {
    const regex = /\b[A-Z]{1,4}\b/gm;
    let matches = text.match(regex) ?? [];
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
    }
    ROOT = await chrome.contextMenus.create({
        id: 'FRNIP_ROOT',
        title: 'FNIP'+suffix,
        // type: 'normal',
        contexts: ['all'],
    });
    console.log('root id =', ROOT)
}

async function getSentiment(text) {
    const settings = (await chrome.storage.local.get(null))['FNIP_SETTINGS'];
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
    });
}

async function generateReport(id) {
    const text = (await chrome.storage.session.get('text')).text;
    const url = (await chrome.storage.session.get('url')).url;
    const sentiments = await getSentiment(text);
    // console.log(sentiments);
    return {
        uid: nanoid(),
        id: id,
        company: ticker[id],
        timestamp: Date.now(),
        sentiments,
        text,
        url,
    }
}

chrome.runtime.onStartup.addListener(async() => {
    console.log('initialize')
    const localData = await chrome.storage.local.get(null);
    if (localData['FNIP_HISTORY']===undefined) {
        await chrome.storage.local.set({'FNIP_HISTORY': []});
    }
    if (localData['FNIP_SETTINGS']===undefined) {
        await chrome.storage.local.set({'FNIP_SETTINGS': {}});
    }
    await addRoot();
})

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