function catchToUndefined(value, func) {
    try {
        return func(value);
    } catch {
        return undefined;
    }
}

function updateTable() {
    chrome.storage.local.get(null, (data) => {
        const tableBody = document.querySelector('#table tbody');
        tableBody.innerHTML = ''; // Clear existing rows
        data.FNIP_HISTORY?.forEach((item) => {
            const row = document.createElement('tr');
            row.onclick = () => openTab(item.uid);
            row.innerHTML = `
                <td>${item.id}</td>
                <td>${catchToUndefined(item.url, (x)=>new URL(x).hostname)}</td>
                <td>${catchToUndefined(item.timestamp, (x)=>new Date(x).toLocaleDateString())}</td>
                <td>${catchToUndefined(item.sentiments, (x)=>getSentimentCell(x))}</td>`;
            tableBody.appendChild(row);
        });
    });
}

function updateFavorites() {
    chrome.storage.local.get('FNIP_FAVORITES', (data) => {
        const favoritesList = document.querySelector('.favorites-list');
        favoritesList.innerHTML = ''; // Clear existing items
        
        const favorites = data.FNIP_FAVORITES || [];
        if (favorites.length === 0) {
            favoritesList.innerHTML = '<p>No favorite tickers added yet.</p>';
            return;
        }
        
        favorites.forEach((item) => {
            const favoriteItem = document.createElement('div');
            favoriteItem.className = 'favorite-item';
            favoriteItem.innerHTML = `
                <div class="favorite-info">
                    <div class="favorite-ticker">${item.ticker}</div>
                    <div class="favorite-company">${item.company}</div>
                </div>
                <div class="favorite-actions">
                    <button class="use-ticker" title="Use this ticker">Use</button>
                    <button class="remove-ticker" title="Remove from favorites">Remove</button>
                </div>
            `;
            
            // Add event listeners
            favoriteItem.querySelector('.use-ticker').addEventListener('click', () => {
                document.getElementById('ticker-search').value = item.ticker;
                // Trigger the input event to validate the ticker
                document.getElementById('ticker-search').dispatchEvent(new Event('input'));
                // Switch to the search tab
                document.getElementById('search-tab').click();
            });
            
            favoriteItem.querySelector('.remove-ticker').addEventListener('click', () => {
                removeFavorite(item.ticker);
            });
            
            favoritesList.appendChild(favoriteItem);
        });
    });
}

function addFavorite(ticker, company) {
    chrome.storage.local.get('FNIP_FAVORITES', (data) => {
        const favorites = data.FNIP_FAVORITES || [];
        // Check if ticker already exists
        if (!favorites.some(item => item.ticker === ticker)) {
            favorites.push({ ticker, company });
            chrome.storage.local.set({ 'FNIP_FAVORITES': favorites }, () => {
                updateFavorites();
            });
        }
    });
}

function removeFavorite(ticker) {
    chrome.storage.local.get('FNIP_FAVORITES', (data) => {
        const favorites = data.FNIP_FAVORITES || [];
        const updatedFavorites = favorites.filter(item => item.ticker !== ticker);
        chrome.storage.local.set({ 'FNIP_FAVORITES': updatedFavorites }, () => {
            updateFavorites();
        });
    });
}

function openTab(uid) {
    chrome.tabs.create({ url: `popup/report.html?uid=${uid}` });
}

function getSentimentCell(sentiments) {
    if (typeof(sentiments)==='string') return 'Failed';
    let senti = sentiments?.[0]?.reduce((acc, cur) => (cur.score > acc.score ? cur : acc), { label: '', score: -1 });
    if (!senti || senti.label === '') return 'Failed';
    const color = { positive: '#32CD32', negative: '#FF4500', neutral: '#1E90FF' }[senti.label];
    return `<span style="color:${color}">${senti.label}</span>`;
}

document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('#navbar button');
    const sections = document.querySelectorAll('.tab-content');

    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => {
            tabs.forEach((t) => t.classList.remove('tab-active'));
            sections.forEach((s) => s.classList.remove('tab-active'));
            tab.classList.add('tab-active');
            sections[index].classList.add('tab-active');
        });
    });

    chrome.storage.local.get('FNIP_SETTINGS', (data) => {
        const settings = data.FNIP_SETTINGS || {};
        console.log('settings:', settings);
        for (const [key, value] of Object.entries(data.FNIP_SETTINGS)) {
            document.getElementById(key).value = value;
        }

        document.getElementById('save-setting').addEventListener('click', () => {
            let newSettings = {...settings}
            document.querySelectorAll('#form-setting input,select').forEach((i)=>{
                newSettings[i.id] = i.value;
            });
            // Save settings to Chrome storage
            chrome.storage.local.set({'FNIP_SETTINGS': newSettings}, () => {
                alert('Settings saved!');
            });
        });
    });

    // Initialize favorites
    if (!chrome.storage.local.get('FNIP_FAVORITES')) {
        chrome.storage.local.set({ 'FNIP_FAVORITES': [] });
    }
    updateFavorites();

    // Add favorite ticker handler
    document.getElementById('add-favorite').addEventListener('click', () => {
        const tickerInput = document.getElementById('new-favorite-ticker');
        const ticker = tickerInput.value.trim().toUpperCase();
        
        if (ticker) {
            import('../ticker.js').then(module => {
                const tickerData = module.default;
                if (tickerData[ticker]) {
                    addFavorite(ticker, tickerData[ticker]);
                    tickerInput.value = '';
                } else {
                    alert('Invalid ticker symbol');
                }
            });
        }
    });

    chrome.storage.local.onChanged.addListener((changes) => {
        if (changes.FNIP_HISTORY) {
            updateTable();
        }
        if (changes.FNIP_FAVORITES) {
            updateFavorites();
        }
    });
    
    updateTable();

    chrome.storage.session.get(null, (data) => {
        const textValid = !!data.text;
        const urlValid = !!data.url;

        document.getElementById('textselect-search').style.background = textValid ? '#0f0' : '#f00';
        document.getElementById('urlselect-search').style.background = urlValid ? '#0f0' : '#f00';
        document.getElementById('textselect-search').parentNode.title = data.text?.split('\n')?.[0] + '...';
        document.getElementById('urlselect-search').parentNode.title = data.url;

        document.getElementById('ticker-search').addEventListener('input', (e) => {
            chrome.runtime.sendMessage({ message: 'checkTicker', ticker: e.target.value }, (res) => {
                document.getElementById('tickervalid-search').style.background = res.valid ? '#0f0' : '#f00';
                document.getElementById('submit-search').disabled = !res.valid || !textValid || !urlValid;
            });
        });

        document.getElementById('clear-search').addEventListener('click', () => {
            chrome.storage.session.remove(['text', 'url']);
        });

        document.getElementById('submit-search').disabled = true;
        document.getElementById('submit-search').addEventListener('click', () => {
            // Also add to favorites if the ticker is valid
            const ticker = document.getElementById('ticker-search').value.trim().toUpperCase();
            import('../ticker.js').then(module => {
                const tickerData = module.default;
                if (tickerData[ticker]) {
                    addFavorite(ticker, tickerData[ticker]);
                }
            });
            
            chrome.runtime.sendMessage({
                message: 'triggerSearch',
                ticker: ticker,
            });
        });
    });

    // Settings section
    const settingsTab = document.getElementById('settings-tab');
    const formSetting = document.getElementById('form-setting');
    const saveSetting = document.getElementById('save-setting');

    settingsTab.addEventListener('click', () => {
        showTab('settings-section');
    });

    saveSetting.addEventListener('click', async (e) => {
        e.preventDefault();
        const formData = new FormData(formSetting);
        const settings = {
            API_KEY: formData.get('apikey'),
            LLM: formData.get('llm'),
            RAG: formData.get('rag') === 'on'
        };
        
        await chrome.storage.local.set({ 'FNIP_SETTINGS': settings });
        
        // Update the root menu title with RAG status
        const suffix = settings.RAG ? ' (RAG enabled)' : '';
        await chrome.contextMenus.update('FRNIP_ROOT', {
            title: 'FNIP' + suffix
        });
        
        alert('Settings saved successfully!');
    });

    // Load saved settings
    chrome.storage.local.get('FNIP_SETTINGS', (data) => {
        const settings = data.FNIP_SETTINGS || {};
        document.getElementById('API_KEY').value = settings.API_KEY || '';
        document.getElementById('LLM').value = settings.LLM || 'HF';
        document.getElementById('RAG').checked = settings.RAG || false;
    });
});
