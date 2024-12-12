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

    chrome.storage.local.onChanged.addListener(updateTable);
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
            chrome.runtime.sendMessage({
                message: 'triggerSearch',
                ticker: document.getElementById('ticker-search').value,
            });
        });
    });
});
