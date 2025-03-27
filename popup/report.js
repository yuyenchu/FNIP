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

function downloadJSON(obj) 
{
    // console.log(JSON.stringify(obj));
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(obj));
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = dataStr;
    a.download = `${document.title}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
}

async function remove() {
    const data = (await chrome.storage.local.get(null)).FNIP_HISTORY.filter((item) => item.uid!==uid);
    await chrome.storage.local.set({'FNIP_HISTORY': data});
}

function createSentimentChart(sentiment) {
    if (!sentiment || !sentiment[0]) return;
    
    const senti = sentiment[0];
    const chartData = {
        labels: [],
        scores: []
    };
    
    senti.forEach(item => {
        chartData.labels.push(item.label.charAt(0).toUpperCase() + item.label.slice(1));
        chartData.scores.push(parseFloat(item.score).toFixed(3));
    });
    
    const ctx = document.getElementById('sentimentChart').getContext('2d');
    const colors = {
        'Positive': 'rgba(50, 205, 50, 0.7)',
        'Negative': 'rgba(255, 69, 0, 0.7)',
        'Neutral': 'rgba(30, 144, 255, 0.7)'
    };
    
    const backgroundColors = chartData.labels.map(label => colors[label] || 'rgba(128, 128, 128, 0.7)');
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'Sentiment Score',
                data: chartData.scores,
                backgroundColor: backgroundColors,
                borderColor: backgroundColors.map(color => color.replace('0.7', '1')),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 1,
                    title: {
                        display: true,
                        text: 'Score'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Score: ${context.raw}`;
                        }
                    }
                }
            }
        }
    });
}

function displaySentimentDetails(sentiment) {
    if (!sentiment || !sentiment[0]) return '';
    
    const senti = sentiment[0];
    let detailsHTML = '';
    
    // Sort by score (highest first)
    const sortedSentiments = [...senti].sort((a, b) => b.score - a.score);
    
    sortedSentiments.forEach(item => {
        const scorePercent = Math.round(item.score * 100);
        const color = {
            'positive': '#32CD32',
            'negative': '#FF4500', 
            'neutral': '#1E90FF'
        }[item.label.toLowerCase()] || '#666';
        
        detailsHTML += `
            <div class="sentiment-item">
                <div class="sentiment-label" style="color:${color}">${item.label.charAt(0).toUpperCase() + item.label.slice(1)}</div>
                <div class="sentiment-score-bar">
                    <div class="bar-fill" style="width:${scorePercent}%; background-color:${color}"></div>
                </div>
                <div class="sentiment-score-value">${Math.round(item.score * 1000) / 1000}</div>
            </div>
        `;
    });
    
    return detailsHTML;
}

function displayImpactDetails(sentiment) {
    if (!sentiment || !sentiment[0]) return;
    
    const senti = sentiment[0][0];
    
    if (senti.impact_time) {
        document.getElementById('impact-time').innerHTML = `
            <div class="impact-time-display">
                <strong>Estimated Impact Time:</strong> ${senti.impact_time} day(s)
            </div>
        `;
    }
    
    if (senti.reason) {
        document.getElementById('impact-reason').innerHTML = `
            <div class="impact-reason-display">
                <strong>Reasoning:</strong> ${senti.reason}
            </div>
        `;
    }
}

function displayStockPerformance(stockData) {
    if (!stockData || stockData.error) {
        document.getElementById('stock-data').innerHTML = '<p>Stock data unavailable</p>';
        return;
    }
    
    const oneDayChange = stockData.oneDayPerformance;
    const fiveDayChange = stockData.fiveDayPerformance;
    
    const oneDayColor = oneDayChange > 0 ? '#32CD32' : oneDayChange < 0 ? '#FF4500' : '#666';
    const fiveDayColor = fiveDayChange > 0 ? '#32CD32' : fiveDayChange < 0 ? '#FF4500' : '#666';
    
    const oneDayDirection = oneDayChange > 0 ? '▲' : oneDayChange < 0 ? '▼' : '';
    const fiveDayDirection = fiveDayChange > 0 ? '▲' : fiveDayChange < 0 ? '▼' : '';
    
    document.getElementById('stock-data').innerHTML = `
        <div class="stock-performance-data">
            <div class="stock-price">
                <div class="price-label">Current Price:</div>
                <div class="price-value">$${stockData.currentPrice.toFixed(2)}</div>
            </div>
            
            <div class="stock-changes">
                <div class="change-item">
                    <div class="change-label">1 Day Change:</div>
                    <div class="change-value" style="color: ${oneDayColor}">
                        ${oneDayDirection} ${Math.abs(oneDayChange).toFixed(2)}%
                    </div>
                </div>
                
                <div class="change-item">
                    <div class="change-label">5 Day Change:</div>
                    <div class="change-value" style="color: ${fiveDayColor}">
                        ${fiveDayDirection} ${Math.abs(fiveDayChange).toFixed(2)}%
                    </div>
                </div>
            </div>
            
            <div class="data-timestamp">
                Last updated: ${new Date(stockData.lastUpdated).toLocaleString()}
            </div>
        </div>
    `;
}

// Share functionality
function setupShareModal() {
    const modal = document.getElementById('shareModal');
    const shareBtn = document.getElementById('share');
    const closeBtn = document.getElementsByClassName('close')[0];
    
    // Open modal when share button is clicked
    shareBtn.onclick = function() {
        modal.style.display = 'block';
    }
    
    // Close modal when X is clicked
    closeBtn.onclick = function() {
        modal.style.display = 'none';
    }
    
    // Close modal when clicking outside of it
    window.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    }
    
    // Copy link button
    document.getElementById('copyLink').addEventListener('click', function() {
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(function() {
            alert('Link copied to clipboard!');
        }, function() {
            prompt('Copy this link:', url);
        });
    });
    
    // Social media sharing
    document.getElementById('shareTwitter').addEventListener('click', function() {
        const text = `Check out this financial analysis on ${document.getElementById('company').innerText.replace('Company: ', '')}`;
        const url = window.location.href;
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
    });
    
    document.getElementById('shareLinkedIn').addEventListener('click', function() {
        const url = window.location.href;
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
    });
    
    document.getElementById('shareEmail').addEventListener('click', function() {
        const subject = `Financial Analysis: ${document.getElementById('company').innerText.replace('Company: ', '')}`;
        const body = `Check out this financial news analysis: ${window.location.href}`;
        window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
    });
}

const uid = new URLSearchParams(location.search).get('uid');
if (uid!==null && uid!==undefined) {
    document.title =`AnalyzeReport_${uid}`;
    chrome.storage.local.get(null, (history)=>{
        const data = history.FNIP_HISTORY.find((item) => item.uid===uid);
        document.getElementById('company').innerText = `Company: ${data.id} (${data.company})`;
        document.getElementById('url').innerHTML = `Article link: <a href=${data.url}>${new URL(data.url).hostname}</a>`;
        document.getElementById('datetime').innerText = `Analysis date: ${new Date(data.timestamp).toLocaleString()}`;
        
        // Display stock performance data
        displayStockPerformance(data.stockPerformance);
        
        // Update to use new sentiment visualization
        document.getElementById('sentiment-details').innerHTML = displaySentimentDetails(data.sentiments);
        createSentimentChart(data.sentiments);
        displayImpactDetails(data.sentiments);
        
        document.getElementById('article').innerText = data.text;
        document.getElementById('json').onclick = ()=>downloadJSON(data);
        
        // Setup share modal
        setupShareModal();
    });
    document.getElementById('download').onclick = window.print.bind();
    document.getElementById('remove').onclick = remove;
}

