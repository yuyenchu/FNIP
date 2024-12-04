// const { jsPDF } = window.jspdf;

// function download() {
//     var doc = new jsPDF();          
//     doc.html(document.body, {
//         callback: function (doc) {
//             doc.save(`AnalyzeReport_${uid}.pdf`);
//         },
//         x: 0,
//         y: 0,
//         html2canvas: {
//             scale: 0.25
//         }
//     });
// }

async function remove() {
    const data = (await chrome.storage.local.get(null)).FNIP_HISTORY.filter((item) => item.uid!==uid);
    await chrome.storage.local.set({'FNIP_HISTORY': data});
}

function formatSentiment(sentiment) {
    if (sentiment===undefined || sentiment[0]===undefined) return JSON.stringify(sentiment);
    let senti = sentiment[0];
    return senti.reduce((accu, curr)=>{
        console.log(curr);
        return accu+`${curr.label}: ${curr.score}`+(curr.impact_time?` - Impact time: ${curr.impact_time} day(s)`:'')+(curr.reason?`\n    Reason: ${curr.reason}`:'')+'\n'
    } ,'');
    // return `${senti[0].label}:${senti[0].score}\n${senti[1].label}:${senti[1].score}\n${senti[2].label}:${senti[2].score}\n`
}

const uid = new URLSearchParams(location.search).get('uid');
if (uid!==null && uid!==undefined) {
    document.title =`AnalyzeReport_${uid}`;
    chrome.storage.local.get(null, (history)=>{
        const data = history.FNIP_HISTORY.find((item) => item.uid===uid);
        document.getElementById('company').innerText = `Company: ${data.id} (${data.company})`;
        document.getElementById('url').innerHTML = `Article link: <a href=${data.url}>${new URL(data.url).hostname}</a>`;
        document.getElementById('datetime').innerText = `Analyze date: ${new Date(data.timestamp).toLocaleString()}`;
        document.getElementById('sentiment').innerText = formatSentiment(data.sentiments);//JSON.stringify(data.sentiments);
        document.getElementById('article').innerText = data.text;
        
    });
    document.getElementById('download').onclick = window.print.bind();
    document.getElementById('remove').onclick = remove;
}