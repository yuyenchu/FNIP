function sortTable(i){
    let table = document.querySelector("#table tbody");
    let trs = table.rows;
    Array.from(trs)
        .sort((a, b) => a.cells[i].textContent - b.cells[i].textContent)
        .forEach(tr => table.appendChild(tr));
}

function getSentimentCell(sentiments) {
    let senti = sentiments?.[0]?.reduce((accu, curr)=>curr.score>accu.score?curr:accu, {label:'', score:-1});
    if (senti===undefined || senti.label==='' ) return 'Failed';
    console.log(sentiments, senti);
    let color = {'positive':'#32CD32','negative':'#FF4500','neutral':'#1E90FF'}[senti.label];
    let alpha = senti.score*0.8+0.2;
    return `<span style="color:${color};opacity:${alpha}">${senti.label}</span>`
}

function openTab(uid) {
    chrome.tabs.create({url: `popup/report.html?uid=${uid}`});
}

let tableItems = {};
function updateTable() {
    chrome.storage.local.get(null, (history)=>{
        console.log(history);
        let table = document.querySelector('table > tbody');
        history.FNIP_HISTORY?.forEach((item) => {
            if (tableItems[item.uid]===undefined) {
                let tr = document.createElement('tr');
                tr.onclick = ()=>openTab(item.uid);
                tr.innerHTML =  '<td>' + item.id + '</td>' +
                                '<td>' + new URL(item.url).hostname + '</td>' +
                                '<td>' + new Date(item.timestamp).toLocaleDateString() + '</td>' +
                                '<td>' + getSentimentCell(item.sentiments) + '</td>';
                table.appendChild(tr);
                tableItems[item.uid] = '';
            }
        });
    });
}

updateTable();
chrome.storage.local.onChanged.addListener(
    () => updateTable()
);

function setTab(e) {
    console.log('click', e.target.id, e.currentTarget.id);
    document.querySelectorAll('#navbar > a').forEach((i)=>i.classList.remove('tab-active'));
    document.querySelectorAll('#tabs-container > div').forEach((i)=>i.classList.remove('tab-active'));
    e.currentTarget.classList.add('tab-active');
    document.getElementById(`tab-${e.currentTarget.id}`).classList.add('tab-active');
}
document.querySelectorAll('#navbar > a').forEach((i)=>{
    i.addEventListener('click', setTab);
});

const tab = new URLSearchParams(location.search).get('tab');
if (tab!==null && tab!==undefined) {
    console.log('default=', tab)
    setTab({currentTarget: document.getElementById(tab)});
}

chrome.storage.local.get(null, (data) => {
    if (data.FNIP_SETTINGS) {
        console.log(data.FNIP_SETTINGS);
        for (const [key, value] of Object.entries(data.FNIP_SETTINGS)) {
            document.getElementById(key).value = value;
        }
        document.getElementById('save-setting').addEventListener('click', (e)=>{
            let settings = {...data.FNIP_SETTINGS}
            document.querySelectorAll('#form-setting input,select').forEach((i)=>{
                settings[i.id] = i.value;
                chrome.storage.local.set({'FNIP_SETTINGS':settings});
            });
        });
    } else {
        chrome.storage.local.set({'FNIP_SETTINGS':{}});
    }
});

let textValid=false, urlValid=false;
chrome.storage.session.get(null, (data) => {
    textValid = data.text?true:false;
    urlValid = data.url?true:false;
    document.getElementById('textselect-search').style.background = data.text?'#0f0':'#f00';
    document.getElementById('urlselect-search').style.background = data.url?'#0f0':'#f00';
});
document.getElementById('ticker-search').addEventListener('input', (e)=>{
    // console.log(e.target.value)
    chrome.runtime.sendMessage({
        'message': 'checkTicker',
        'ticker': e.target.value
    }, (res)=>{
        document.getElementById('tickervalid-search').style.background = res.valid?'#0f0':'#f00';
        document.getElementById('submit-search').disabled = !res.valid || !textValid || !urlValid;
    });
});
document.getElementById('clear-search').addEventListener('click', (e)=>{
    chrome.storage.session.remove(['text', 'url']);
});
document.getElementById('submit-search').disabled = true;
document.getElementById('submit-search').addEventListener('click', (e)=>{
    chrome.runtime.sendMessage({
        'message': 'triggerSearch',
        'ticker': document.getElementById('ticker-search').value
    });
});