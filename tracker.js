const https = require('https');
const fs = require('fs');

// Cấu hình
const API_BASE_URL = 'https://spx.vn/shipment/order/open/order/get_order_info';
const LANGUAGE_CODE = 'vi';
const STATE_FILE = 'tracking-state.json';

// Proxy CORS (dùng cho GitHub Actions)
const PROXY = 'https://api.allorigins.win/raw?url=';

// Danh sách mã cần theo dõi (cập nhật danh sách này)
const TRACKING_CODES = [
    { code: 'SPXVN05534258930B', note: 'Đơn chị a' },
    { code: 'VN2523294629250', note: 'Đơn chị b' },
    { code: 'SPXVN05182782752B', note: 'Đơn quần' },
    { code: 'SPXVN05832874688B', note: 'Đơn áo' }
];

// Đọc state cũ
function loadState() {
    try {
        if (fs.existsSync(STATE_FILE)) {
            return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading state:', error);
    }
    return {};
}

// Lưu state mới
function saveState(state) {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// Fetch API
function fetchTracking(code) {
    return new Promise((resolve, reject) => {
        const apiUrl = `${API_BASE_URL}?spx_tn=${encodeURIComponent(code)}&language_code=${LANGUAGE_CODE}`;
        const url = `${PROXY}${encodeURIComponent(apiUrl)}`;
        
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

// Gửi Discord notification
function sendDiscordNotification(message) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
        console.log('No Discord webhook configured');
        return;
    }

    const data = JSON.stringify({
        embeds: [{
            title: '📦 Cập nhật trạng thái vận đơn',
            description: message,
            color: 5814783,
            timestamp: new Date().toISOString()
        }]
    });

    const url = new URL(webhookUrl);
    const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    const req = https.request(options, (res) => {
        console.log(`Discord notification sent: ${res.statusCode}`);
    });

    req.on('error', (error) => {
        console.error('Error sending Discord notification:', error);
    });

    req.write(data);
    req.end();
}

// Format timestamp
function formatTime(timestamp) {
    const date = new Date(timestamp * 1000);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

// Main function
async function checkAllTracking() {
    console.log('Starting tracking check...');
    
    const oldState = loadState();
    const newState = {};
    const notifications = [];

    for (const item of TRACKING_CODES) {
        try {
            console.log(`Checking ${item.code}...`);
            const response = await fetchTracking(item.code);
            
            if (response.retcode === 0 && response.data?.sls_tracking_info?.records) {
                const records = response.data.sls_tracking_info.records;
                const firstRecord = records[0];
                
                const currentStatus = {
                    tracking_code: firstRecord?.tracking_code || '',
                    description: firstRecord?.description || '',
                    actual_time: firstRecord?.actual_time || 0
                };
                
                newState[item.code] = currentStatus;
                
                // Kiểm tra thay đổi dựa vào tracking_code
                const oldStatus = oldState[item.code];
                if (oldStatus) {
                    if (oldStatus.tracking_code !== currentStatus.tracking_code) {
                        
                        const timeDisplay = currentStatus.actual_time ? formatTime(currentStatus.actual_time) : '';
                        const noteText = item.note ? ` (${item.note})` : '';
                        
                        notifications.push(
                            `**${item.code}**${noteText}\n` +
                            `🔄 Mã trạng thái: ${currentStatus.tracking_code}\n` +
                            `📝 Chi tiết: ${currentStatus.description}\n` +
                            `⏰ Thời gian: ${timeDisplay}\n` +
                            `📍 Trạng thái cũ: ${oldStatus.tracking_code || 'N/A'}`
                        );
                    }
                } else {
                    // Lần đầu tiên track
                    console.log(`First time tracking ${item.code}`);
                }
            } else {
                console.log(`No data for ${item.code}`);
                newState[item.code] = oldState[item.code] || null;
            }
            
            // Delay để tránh rate limit
            await new Promise(resolve => setTimeout(resolve, 1000));
            
        } catch (error) {
            console.error(`Error checking ${item.code}:`, error.message);
            newState[item.code] = oldState[item.code] || null;
        }
    }
    
    // Lưu state mới
    saveState(newState);
    
    // Gửi notification nếu có thay đổi
    if (notifications.length > 0) {
        const message = notifications.join('\n\n---\n\n');
        sendDiscordNotification(message);
        console.log(`Sent ${notifications.length} notification(s)`);
    } else {
        console.log('No changes detected');
    }
}

// Run
checkAllTracking().catch(console.error);
