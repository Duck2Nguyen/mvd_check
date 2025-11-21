const API_BASE_URL = 'https://spx.vn/shipment/order/open/order/get_order_info';
const LANGUAGE_CODE = 'vi';

// Multiple CORS proxy options with auto-fallback
const CORS_PROXIES = [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
    'https://proxy.cors.sh/',
    'https://api.codetabs.com/v1/proxy?quest=',
    'https://thingproxy.freeboard.io/fetch/',
];

let currentProxyIndex = 0;

document.addEventListener('DOMContentLoaded', () => {
    // Tab 1 elements
    const trackingInput = document.getElementById('trackingInput');
    const checkButton = document.getElementById('checkButton');
    const switchProxyButton = document.getElementById('switchProxyButton');
    const resultsSection = document.getElementById('results');
    const resultsList = document.getElementById('resultsList');
    const proxyStatus = document.getElementById('proxyStatus');

    // Tab 2 elements
    const monitorInput = document.getElementById('monitorInput');
    const saveMonitorList = document.getElementById('saveMonitorList');
    const notificationToggle = document.getElementById('notificationToggle');
    const toggleLabel = document.getElementById('toggleLabel');
    const monitorStatus = document.getElementById('monitorStatus');
    const monitorResults = document.getElementById('monitorResults');
    const monitorList = document.getElementById('monitorList');

    // Tab switching
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;
            
            // Update active tab
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Update active content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `${targetTab}-tab`) {
                    content.classList.add('active');
                }
            });
        });
    });

    // Tab 1 handlers
    checkButton.addEventListener('click', handleCheck);
    switchProxyButton.addEventListener('click', switchProxy);
    
    trackingInput.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            handleCheck();
        }
    });

    // Tab 2 handlers
    saveMonitorList.addEventListener('click', handleSaveMonitorList);
    notificationToggle.addEventListener('change', handleNotificationToggle);

    // Load monitor data
    loadMonitorData();
    updateProxyStatus();
});

function switchProxy() {
    currentProxyIndex = (currentProxyIndex + 1) % CORS_PROXIES.length;
    updateProxyStatus();
    
    // Auto re-check if there are tracking codes
    const trackingInput = document.getElementById('trackingInput');
    const input = trackingInput.value.trim();
    
    if (input) {
        // Auto trigger check with new proxy
        handleCheck();
    }
}

function updateProxyStatus() {
    const proxyStatus = document.getElementById('proxyStatus');
    const proxyNames = [
        'Cors.sh',
        'AllOrigins',
        'CorsProxy.io',
        'CodeTabs',
        'Freeboard'
    ];
    proxyStatus.textContent = `🌐 Sử dụng proxy: ${proxyNames[currentProxyIndex]}`;
    proxyStatus.className = 'proxy-status active';
}

async function handleCheck() {
    const trackingInput = document.getElementById('trackingInput');
    const checkButton = document.getElementById('checkButton');
    const btnText = checkButton.querySelector('.btn-text');
    const loader = checkButton.querySelector('.loader');
    const resultsSection = document.getElementById('results');
    const resultsList = document.getElementById('resultsList');

    const input = trackingInput.value.trim();
    
    if (!input) {
        alert('Vui lòng nhập ít nhất một mã vận đơn');
        return;
    }

    // Parse tracking codes with notes
    const trackingData = input
        .split('\n')
        .map(line => {
            line = line.trim();
            if (!line) return null;
            
            // Check if line contains ( or whitespace after code
            let code = line;
            let note = '';
            
            // Split by ( first
            if (line.includes('(')) {
                const parts = line.split('(');
                code = parts[0].trim();
                // Remove ) and get note content
                note = parts.slice(1).join('(').replace(/\)/g, '').trim();
            } else {
                // Split by whitespace
                const parts = line.split(/\s+/);
                code = parts[0];
                note = parts.slice(1).join(' ').trim();
            }
            
            return { code, note };
        })
        .filter(item => item !== null && item.code.length > 0);

    if (trackingData.length === 0) {
        alert('Không tìm thấy mã vận đơn hợp lệ');
        return;
    }

    // Disable button and show loader
    checkButton.disabled = true;
    btnText.textContent = 'Đang kiểm tra...';
    loader.style.display = 'block';

    try {
        // Fetch all tracking info
        const results = await Promise.all(
            trackingData.map(item => fetchTrackingInfo(item.code, 0, item.note))
        );

        // Display results
        displayResults(results);
        resultsSection.style.display = 'block';
        
        // Update proxy status after check
        updateProxyStatus();
        
        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (error) {
        alert('Đã xảy ra lỗi khi kiểm tra. Vui lòng thử lại.');
        console.error(error);
    } finally {
        // Re-enable button
        checkButton.disabled = false;
        btnText.textContent = 'Kiểm tra';
        loader.style.display = 'none';
    }
}

async function fetchTrackingInfo(trackingCode, retryCount = 0, note = '') {
    const apiUrl = `${API_BASE_URL}?spx_tn=${encodeURIComponent(trackingCode)}&language_code=${LANGUAGE_CODE}`;
    
    // Try with current proxy
    const proxy = CORS_PROXIES[currentProxyIndex];
    const url = `${proxy}${encodeURIComponent(apiUrl)}`;
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
        
        const response = await fetch(url, { 
            signal: controller.signal,
            headers: {
                'Accept': 'application/json',
            }
        });
        clearTimeout(timeoutId);
        
        const data = await response.json();
        
        if (data.retcode === 0 && data.data?.sls_tracking_info?.records) {
            const records = data.data.sls_tracking_info.records;
            const firstRecord = records[0];
            
            return {
                code: trackingCode,
                note: note,
                success: true,
                description: firstRecord?.description || 'Không có thông tin trạng thái',
                actualTime: firstRecord?.actual_time || null,
                fullData: firstRecord
            };
        } else {
            return {
                code: trackingCode,
                note: note,
                success: false,
                error: data.message || 'Không thể lấy thông tin vận đơn'
            };
        }
    } catch (error) {
        // Auto retry with different proxy
        if (retryCount < CORS_PROXIES.length - 1) {
            console.log(`Proxy ${currentProxyIndex} failed for ${trackingCode}, trying next proxy...`);
            const nextProxyIndex = (currentProxyIndex + 1) % CORS_PROXIES.length;
            
            // Try next proxy for this specific request
            const nextProxy = CORS_PROXIES[nextProxyIndex];
            const nextUrl = `${nextProxy}${encodeURIComponent(apiUrl)}`;
            
            try {
                const response = await fetch(nextUrl, {
                    headers: { 'Accept': 'application/json' }
                });
                const data = await response.json();
                
                if (data.retcode === 0 && data.data?.sls_tracking_info?.records) {
                    const records = data.data.sls_tracking_info.records;
                    const firstRecord = records[0];
                    
                    return {
                        code: trackingCode,
                        note: note,
                        success: true,
                        description: firstRecord?.description || 'Không có thông tin trạng thái',
                        actualTime: firstRecord?.actual_time || null,
                        fullData: firstRecord
                    };
                }
            } catch (retryError) {
                console.log(`Retry also failed for ${trackingCode}`);
            }
        }
        
        return {
            code: trackingCode,
            note: note,
            success: false,
            error: 'Lỗi kết nối: ' + (error.name === 'AbortError' ? 'Timeout' : error.message)
        };
    }
}

function displayResults(results) {
    const resultsList = document.getElementById('resultsList');
    
    // Calculate summary
    const total = results.length;
    const success = results.filter(r => r.success).length;
    const failed = total - success;
    
    // Create summary
    const summaryHTML = `
        <div class="summary">
            <div class="summary-item">
                <div class="summary-label">Tổng số</div>
                <div class="summary-value">${total}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Thành công</div>
                <div class="summary-value" style="color: #28a745;">${success}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Thất bại</div>
                <div class="summary-value" style="color: #dc3545;">${failed}</div>
            </div>
        </div>
    `;
    
    // Create results list
    const resultsHTML = results.map(result => {
        const trackingUrl = `https://spx.vn/track?${encodeURIComponent(result.code)}`;
        const timeDisplay = result.actualTime ? formatTimestamp(result.actualTime) : '';
        const noteDisplay = result.note ? `<span class="tracking-note">📝 ${escapeHtml(result.note)}</span>` : '';
        
        if (result.success) {
            return `
                <div class="result-item success">
                    <div class="result-header">
                        <div class="tracking-code">
                            <div class="code-line">
                                <span class="success-icon">✓</span>
                                <span>${escapeHtml(result.code)}</span>
                            </div>
                            ${noteDisplay}
                        </div>
                        <a href="${trackingUrl}" target="_blank" class="btn-detail">Xem chi tiết →</a>
                    </div>
                    <div class="tracking-status">
                        ${escapeHtml(result.description)}
                    </div>
                    ${timeDisplay ? `<div class="tracking-time">🕐 ${timeDisplay}</div>` : ''}
                </div>
            `;
        } else {
            return `
                <div class="result-item error">
                    <div class="result-header">
                        <div class="tracking-code">
                            <div class="code-line">
                                <span class="error-icon">✗</span>
                                <span>${escapeHtml(result.code)}</span>
                            </div>
                            ${noteDisplay}
                        </div>
                        <a href="${trackingUrl}" target="_blank" class="btn-detail">Xem chi tiết →</a>
                    </div>
                    <div class="error-message">
                        ${escapeHtml(result.error)}
                    </div>
                </div>
            `;
        }
    }).join('');
    
    resultsList.innerHTML = summaryHTML + resultsHTML;
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp * 1000);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== TAB 2: MONITOR FUNCTIONS ==========

const MONITOR_STORAGE_KEY = 'mvd_monitor_list';
const MONITOR_STATE_KEY = 'mvd_monitor_state';
const NOTIFICATION_KEY = 'mvd_notification_enabled';
let monitorInterval = null;

function loadMonitorData() {
    const savedList = localStorage.getItem(MONITOR_STORAGE_KEY);
    const notificationEnabled = localStorage.getItem(NOTIFICATION_KEY) === 'true';
    
    if (savedList) {
        document.getElementById('monitorInput').value = savedList;
        displayMonitorList();
    }
    
    const toggle = document.getElementById('notificationToggle');
    toggle.checked = notificationEnabled;
    updateToggleLabel(notificationEnabled);
    
    if (notificationEnabled) {
        startMonitoring();
    }
}

function handleSaveMonitorList() {
    const monitorInput = document.getElementById('monitorInput');
    const input = monitorInput.value.trim();
    
    if (!input) {
        alert('Vui lòng nhập danh sách mã vận đơn');
        return;
    }
    
    localStorage.setItem(MONITOR_STORAGE_KEY, input);
    displayMonitorList();
    
    const monitorStatus = document.getElementById('monitorStatus');
    monitorStatus.textContent = '✅ Đã lưu danh sách theo dõi';
    monitorStatus.classList.add('active');
    
    setTimeout(() => {
        monitorStatus.classList.remove('active');
    }, 3000);
}

function displayMonitorList() {
    const input = localStorage.getItem(MONITOR_STORAGE_KEY);
    if (!input) return;
    
    const trackingData = input
        .split('\n')
        .map(line => {
            line = line.trim();
            if (!line) return null;
            
            let code = line;
            let note = '';
            
            if (line.includes('(')) {
                const parts = line.split('(');
                code = parts[0].trim();
                note = parts.slice(1).join('(').replace(/\)/g, '').trim();
            } else {
                const parts = line.split(/\s+/);
                code = parts[0];
                note = parts.slice(1).join(' ').trim();
            }
            
            return { code, note };
        })
        .filter(item => item !== null && item.code.length > 0);
    
    const monitorResults = document.getElementById('monitorResults');
    const monitorList = document.getElementById('monitorList');
    
    if (trackingData.length === 0) {
        monitorResults.style.display = 'none';
        return;
    }
    
    const html = trackingData.map(item => {
        return `
            <div class="monitor-item">
                <div class="monitor-item-header">
                    <span class="monitor-code">${escapeHtml(item.code)}</span>
                    ${item.note ? `<span class="monitor-note">📝 ${escapeHtml(item.note)}</span>` : ''}
                </div>
                <div class="monitor-item-status" id="status-${escapeHtml(item.code)}">
                    ⏳ Đang chờ cập nhật...
                </div>
            </div>
        `;
    }).join('');
    
    monitorList.innerHTML = html;
    monitorResults.style.display = 'block';
}

function handleNotificationToggle(e) {
    const enabled = e.target.checked;
    localStorage.setItem(NOTIFICATION_KEY, enabled);
    updateToggleLabel(enabled);
    
    if (enabled) {
        if (!localStorage.getItem(MONITOR_STORAGE_KEY)) {
            alert('Vui lòng lưu danh sách theo dõi trước');
            e.target.checked = false;
            return;
        }
        startMonitoring();
    } else {
        stopMonitoring();
    }
}

function updateToggleLabel(enabled) {
    const label = document.getElementById('toggleLabel');
    label.textContent = enabled ? '🔔 Thông báo: BẬT' : '🔕 Thông báo: TẮT';
    label.style.color = enabled ? '#28a745' : '#666';
}

function startMonitoring() {
    stopMonitoring(); // Clear existing interval
    
    const monitorStatus = document.getElementById('monitorStatus');
    monitorStatus.textContent = '🔄 Đang theo dõi... Kiểm tra mỗi 5 phút';
    monitorStatus.classList.add('active');
    
    // Check immediately
    checkMonitorList();
    
    // Then check every 5 minutes
    monitorInterval = setInterval(checkMonitorList, 5 * 60 * 1000);
}

function stopMonitoring() {
    if (monitorInterval) {
        clearInterval(monitorInterval);
        monitorInterval = null;
    }
    
    const monitorStatus = document.getElementById('monitorStatus');
    monitorStatus.textContent = '⏸️ Đã dừng theo dõi';
    monitorStatus.classList.add('active');
    
    setTimeout(() => {
        monitorStatus.classList.remove('active');
    }, 3000);
}

async function checkMonitorList() {
    const input = localStorage.getItem(MONITOR_STORAGE_KEY);
    if (!input) return;
    
    const trackingData = input
        .split('\n')
        .map(line => {
            line = line.trim();
            if (!line) return null;
            
            let code = line;
            let note = '';
            
            if (line.includes('(')) {
                const parts = line.split('(');
                code = parts[0].trim();
                note = parts.slice(1).join('(').replace(/\)/g, '').trim();
            } else {
                const parts = line.split(/\s+/);
                code = parts[0];
                note = parts.slice(1).join(' ').trim();
            }
            
            return { code, note };
        })
        .filter(item => item !== null && item.code.length > 0);
    
    const savedState = JSON.parse(localStorage.getItem(MONITOR_STATE_KEY) || '{}');
    const newState = {};
    
    for (const item of trackingData) {
        try {
            const result = await fetchTrackingInfo(item.code, 0, item.note);
            
            const statusElement = document.getElementById(`status-${item.code}`);
            if (result.success) {
                const timeDisplay = result.actualTime ? formatTimestamp(result.actualTime) : '';
                statusElement.innerHTML = `
                    <div style="color: #28a745;">✓ ${escapeHtml(result.description)}</div>
                    ${timeDisplay ? `<div style="font-size: 0.85rem; color: #888;">🕐 ${timeDisplay}</div>` : ''}
                `;
                
                // Check for changes
                const oldStatus = savedState[item.code];
                if (oldStatus && oldStatus.tracking_code !== result.fullData?.tracking_code) {
                    // Send browser notification
                    sendBrowserNotification(item.code, item.note, result.description);
                }
                
                newState[item.code] = {
                    tracking_code: result.fullData?.tracking_code || '',
                    description: result.description
                };
            } else {
                if (statusElement) {
                    statusElement.innerHTML = `<div style="color: #dc3545;">✗ ${escapeHtml(result.error)}</div>`;
                }
                newState[item.code] = savedState[item.code] || null;
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error(`Error checking ${item.code}:`, error);
        }
    }
    
    localStorage.setItem(MONITOR_STATE_KEY, JSON.stringify(newState));
}

function sendBrowserNotification(code, note, description) {
    if (!("Notification" in window)) {
        console.log("Browser doesn't support notifications");
        return;
    }
    
    if (Notification.permission === "granted") {
        const title = `📦 ${code}${note ? ` (${note})` : ''}`;
        new Notification(title, {
            body: `🔄 ${description}`,
            icon: 'https://spx.vn/favicon.ico',
            tag: code
        });
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                sendBrowserNotification(code, note, description);
            }
        });
    }
}
