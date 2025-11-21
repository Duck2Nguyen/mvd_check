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
    const trackingInput = document.getElementById('trackingInput');
    const checkButton = document.getElementById('checkButton');
    const switchProxyButton = document.getElementById('switchProxyButton');
    const resultsSection = document.getElementById('results');
    const resultsList = document.getElementById('resultsList');
    const proxyStatus = document.getElementById('proxyStatus');

    checkButton.addEventListener('click', handleCheck);
    switchProxyButton.addEventListener('click', switchProxy);
    
    // Show current proxy
    updateProxyStatus();

    // Allow Enter key in textarea, Ctrl+Enter to submit
    trackingInput.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            handleCheck();
        }
    });
});

function switchProxy() {
    currentProxyIndex = (currentProxyIndex + 1) % CORS_PROXIES.length;
    updateProxyStatus();
    
    // Show notification
    const proxyNames = [ 'Cors.sh','AllOrigins', 'CorsProxy.io', 'CodeTabs', 'Freeboard'];
    alert(`Đã chuyển sang proxy: ${proxyNames[currentProxyIndex]}`);
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

    // Parse tracking codes
    const trackingCodes = input
        .split('\n')
        .map(code => code.trim())
        .filter(code => code.length > 0);

    if (trackingCodes.length === 0) {
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
            trackingCodes.map(code => fetchTrackingInfo(code))
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

async function fetchTrackingInfo(trackingCode, retryCount = 0) {
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
                success: true,
                description: firstRecord?.description || 'Không có thông tin trạng thái',
                actualTime: firstRecord?.actual_time || null,
                fullData: firstRecord
            };
        } else {
            return {
                code: trackingCode,
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
        
        if (result.success) {
            return `
                <div class="result-item success">
                    <div class="result-header">
                        <div class="tracking-code">
                            <span class="success-icon">✓</span>
                            ${escapeHtml(result.code)}
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
                            <span class="error-icon">✗</span>
                            ${escapeHtml(result.code)}
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
