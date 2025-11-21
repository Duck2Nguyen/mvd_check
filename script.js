const API_BASE_URL = 'https://spx.vn/shipment/order/open/order/get_order_info';
const LANGUAGE_CODE = 'vi';

// Cloudflare Workers proxy (100k requests/ngày miễn phí mãi mãi)
const PROXY_URL = 'https://soft-dream-598e.taikhoanemail109.workers.dev?url=';

document.addEventListener('DOMContentLoaded', () => {
    // Tab 1 elements
    const trackingInput = document.getElementById('trackingInput');
    const checkButton = document.getElementById('checkButton');
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

function updateProxyStatus() {
    const proxyStatus = document.getElementById('proxyStatus');
    proxyStatus.textContent = '🌐 Cloudflare Workers (Ổn định)';
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
            trackingData.map(item => fetchTrackingInfo(item.code, item.note))
        );

        // Display results
        displayResults(results);
        resultsSection.style.display = 'block';
        
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

async function fetchTrackingInfo(trackingCode, note = '') {
    const apiUrl = `${API_BASE_URL}?spx_tn=${encodeURIComponent(trackingCode)}&language_code=${LANGUAGE_CODE}`;
    const url = `${PROXY_URL}${encodeURIComponent(apiUrl)}`;
    
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
        console.error(`Error fetching tracking info for ${trackingCode}:`, error);
        return {
            code: trackingCode,
            note: note,
            success: false,
            error: 'Lỗi kết nối. Vui lòng thử lại.'
        };
    }
}

function displayResults(results) {
    const resultsList = document.getElementById('resultsList');
    resultsList.innerHTML = '';

    results.forEach((result, index) => {
        const resultCard = document.createElement('div');
        resultCard.className = 'result-card';
        
        if (result.success) {
            // Format time
            const time = result.actualTime 
                ? new Date(result.actualTime * 1000).toLocaleString('vi-VN')
                : 'Không rõ';
            
            resultCard.innerHTML = `
                <div class="result-header">
                    <div class="tracking-code">
                        <div class="code-line">
                            <span>${result.code}</span>
                            ${result.note ? `<span class="tracking-note">${result.note}</span>` : ''}
                        </div>
                    </div>
                    <div class="result-actions">
                        <a href="https://spx.vn/track?${result.code}" 
                           target="_blank" 
                           class="btn-detail">Chi tiết →</a>
                    </div>
                </div>
                <div class="tracking-status">${result.description}</div>
                <div class="tracking-time">🕒 ${time}</div>
            `;
        } else {
            resultCard.innerHTML = `
                <div class="result-header">
                    <div class="tracking-code">
                        <div class="code-line">
                            <span>${result.code}</span>
                            ${result.note ? `<span class="tracking-note">${result.note}</span>` : ''}
                        </div>
                    </div>
                    <span class="status-badge error">✗</span>
                </div>
                <div class="error-message">${result.error}</div>
            `;
        }
        
        resultsList.appendChild(resultCard);
    });
}

// ==================== TAB 2: MONITOR ====================

let monitorInterval = null;
let isMonitoring = false;

function loadMonitorData() {
    const savedData = localStorage.getItem('monitorData');
    const notificationEnabled = localStorage.getItem('notificationEnabled') === 'true';
    
    const monitorInput = document.getElementById('monitorInput');
    const notificationToggle = document.getElementById('notificationToggle');
    const toggleLabel = document.getElementById('toggleLabel');
    
    if (savedData) {
        monitorInput.value = savedData;
    }
    
    notificationToggle.checked = notificationEnabled;
    toggleLabel.textContent = notificationEnabled ? 'BẬT' : 'TẮT';
    
    // If we have data, start monitoring
    if (savedData && notificationEnabled) {
        startMonitoring();
    }
}

async function handleSaveMonitorList() {
    const monitorInput = document.getElementById('monitorInput');
    const data = monitorInput.value.trim();
    
    if (!data) {
        alert('Vui lòng nhập danh sách mã vận đơn cần theo dõi');
        return;
    }
    
    // Save to localStorage
    localStorage.setItem('monitorData', data);
    
    alert('✓ Đã lưu danh sách theo dõi');
    
    // If notifications are enabled, start monitoring
    const notificationEnabled = document.getElementById('notificationToggle').checked;
    if (notificationEnabled) {
        startMonitoring();
    }
}

async function handleNotificationToggle(e) {
    const enabled = e.target.checked;
    const toggleLabel = document.getElementById('toggleLabel');
    
    toggleLabel.textContent = enabled ? 'BẬT' : 'TẮT';
    localStorage.setItem('notificationEnabled', enabled);
    
    if (enabled) {
        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                alert('⚠️ Bạn cần cho phép thông báo để sử dụng tính năng này');
                e.target.checked = false;
                toggleLabel.textContent = 'TẮT';
                localStorage.setItem('notificationEnabled', false);
                return;
            }
        }
        
        startMonitoring();
        alert('✓ Đã bật theo dõi tự động. Trang web cần mở để nhận thông báo.');
    } else {
        stopMonitoring();
        alert('Đã tắt theo dõi tự động');
    }
}

function startMonitoring() {
    if (isMonitoring) return;
    
    isMonitoring = true;
    const monitorStatus = document.getElementById('monitorStatus');
    monitorStatus.innerHTML = '🟢 Đang theo dõi...';
    monitorStatus.className = 'monitor-status-bar active';
    
    // Check immediately
    checkMonitoredShipments();
    
    // Then check every 5 minutes
    monitorInterval = setInterval(checkMonitoredShipments, 5 * 60 * 1000);
}

function stopMonitoring() {
    isMonitoring = false;
    
    if (monitorInterval) {
        clearInterval(monitorInterval);
        monitorInterval = null;
    }
    
    const monitorStatus = document.getElementById('monitorStatus');
    monitorStatus.innerHTML = '⚪ Không theo dõi';
    monitorStatus.className = 'monitor-status-bar';
}

async function checkMonitoredShipments() {
    const monitorInput = document.getElementById('monitorInput');
    const input = monitorInput.value.trim();
    
    if (!input) return;
    
    const monitorStatus = document.getElementById('monitorStatus');
    monitorStatus.innerHTML = '🔄 Đang kiểm tra...';
    
    // Parse tracking codes
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
    
    if (trackingData.length === 0) return;
    
    // Fetch all tracking info
    const results = await Promise.all(
        trackingData.map(item => fetchTrackingInfo(item.code, item.note))
    );
    
    // Display monitor results
    displayMonitorResults(results);
    
    // Check for status changes and send notifications
    checkForStatusChanges(results);
    
    // Update status
    const now = new Date().toLocaleTimeString('vi-VN');
    monitorStatus.innerHTML = `🟢 Kiểm tra lúc ${now}`;
}

function displayMonitorResults(results) {
    const monitorList = document.getElementById('monitorList');
    const monitorResults = document.getElementById('monitorResults');
    
    monitorList.innerHTML = '';
    
    results.forEach(result => {
        const item = document.createElement('div');
        item.className = 'monitor-item';
        
        if (result.success) {
            const time = result.actualTime 
                ? new Date(result.actualTime * 1000).toLocaleString('vi-VN')
                : 'Không rõ';
            
            item.innerHTML = `
                <div class="monitor-item-header">
                    <span class="monitor-code">${result.code}</span>
                    ${result.note ? `<span class="monitor-note">${result.note}</span>` : ''}
                </div>
                <div class="monitor-status">${result.description}</div>
                <div class="monitor-time">🕒 ${time}</div>
            `;
        } else {
            item.innerHTML = `
                <div class="monitor-item-header">
                    <span class="monitor-code">${result.code}</span>
                    ${result.note ? `<span class="monitor-note">${result.note}</span>` : ''}
                </div>
                <div class="monitor-error">❌ ${result.error}</div>
            `;
        }
        
        monitorList.appendChild(item);
    });
    
    monitorResults.style.display = 'block';
}

function checkForStatusChanges(results) {
    // Get previous states
    const savedStates = JSON.parse(localStorage.getItem('trackingStates') || '{}');
    let hasChanges = false;
    
    results.forEach(result => {
        if (result.success) {
            const previousState = savedStates[result.code];
            const currentState = result.description;
            
            // If status changed, send notification
            if (previousState && previousState !== currentState) {
                sendNotification(result);
                hasChanges = true;
            }
            
            // Update saved state
            savedStates[result.code] = currentState;
        }
    });
    
    // Save updated states
    localStorage.setItem('trackingStates', JSON.stringify(savedStates));
    
    // Play sound if there are changes
    if (hasChanges) {
        playNotificationSound();
    }
}

function sendNotification(result) {
    if ('Notification' in window && Notification.permission === 'granted') {
        const title = `📦 Cập nhật: ${result.code}`;
        const body = result.note 
            ? `${result.note}\n${result.description}`
            : result.description;
        
        new Notification(title, {
            body: body,
            icon: 'https://spx.vn/favicon.ico',
            tag: result.code
        });
    }
}

function playNotificationSound() {
    // Create a simple beep sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
}
