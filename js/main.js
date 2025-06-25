document.addEventListener('DOMContentLoaded', function() {
    // 初始化加载动画
    initLoadingAnimation();
    
    // 监听页面加载完成事件
    window.addEventListener('load', function() {
        // 页面资源加载完成后显示最终动画
        finishLoadingAnimation();
    });
    
    const servers = [
        {
            name: "樱花Frp",
            ip: "s1.msfxp.top",
            port: "23236",
            delay: 999,
            status: "unknown"
        },
        {
            name: "南方节点",
            ip: "s2.msfxp.top",
            port: "19125",
            delay: 999,
            status: "unknown"
        },
        {
            name: "日本节点",
            ip: "s3.msfxp.top",
            port: "19125",
            delay: 999,
            status: "unknown"
        }
    ];
    
    // 初始化轮播图
    initGallery();
    
    // 使服务器数据全局可访问
    window.servers = servers;
    
    // 检测Mac设备，设置全局变量
    window.isMacDevice = detectDevice().mac;
    
    let currentServerIndex = 0;
    
    const motdContainer = document.getElementById('motdContainer');
    
    motdContainer.innerHTML = `
        <div class="motd-loading">
            <i class="fas fa-spinner fa-spin"></i>
            <div>正在连接服务器...</div>
        </div>
    `;
    
    // 同时获取所有服务器的状态
    fetchAllServersStatus();
    
    // 设置定时刷新
    setInterval(fetchAllServersStatus, 60000);
    
    // 同时获取所有服务器的状态
    function fetchAllServersStatus() {
        // 重置服务器状态
        servers.forEach(server => {
            server.status = "unknown";
        });
        
        // 获取全部服务器的状态
        const fetchPromises = servers.map((server, index) => {
            const serverAddress = `${server.ip}:${server.port}`;
            const apiUrl = `https://motdbe.blackbe.work/api?host=${serverAddress}`;
            
            return fetch(apiUrl)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('网络响应错误');
                    }
                    return response.json();
                })
                .then(data => {
                    servers[index].delay = data.delay || 999;
                    servers[index].status = "online";
                    servers[index].data = data;
                    return data;
                })
                .catch(error => {
                    console.error(`获取服务器 ${serverAddress} 状态失败:`, error);
                    servers[index].delay = 999;
                    servers[index].status = "offline";
                    return null;
                });
        });
        
        // 等待所有请求完成
        Promise.all(fetchPromises).then(() => {
            // 查找延迟最低的在线服务器
            let lowestDelayIndex = -1;
            let lowestDelay = 999999;
            
            for (let i = 0; i < servers.length; i++) {
                if (servers[i].status === "online" && servers[i].delay < lowestDelay) {
                    lowestDelay = servers[i].delay;
                    lowestDelayIndex = i;
                }
            }
            
            // 如果找到在线服务器，显示延迟最低的
            if (lowestDelayIndex >= 0) {
                currentServerIndex = lowestDelayIndex;
                updateMotdDisplay(servers[lowestDelayIndex].data, servers[lowestDelayIndex], servers);
            } else {
                // 如果所有服务器都离线，显示离线状态
                displayOfflineStatus(servers[0]);
            }
        });
    }
    
    window.switchServer = function(index) {
        if (index >= 0 && index < servers.length) {
            currentServerIndex = index;
            
            if (servers[index].status === "online" && servers[index].data) {
                // 如果已经有数据，直接显示
                updateMotdDisplay(servers[index].data, servers[index], servers);
            } else if (servers[index].status === "offline") {
                // 如果已知离线，显示离线状态
                displayOfflineStatus(servers[index]);
            } else {
                // 如果状态未知，重新获取
                const serverAddress = `${servers[index].ip}:${servers[index].port}`;
                const apiUrl = `https://motdbe.blackbe.work/api?host=${serverAddress}`;
                
                // 显示加载状态
                motdContainer.innerHTML = `
                    <div class="motd-loading">
                        <i class="fas fa-spinner fa-spin"></i>
                        <div>正在连接服务器...</div>
                    </div>
                `;
                
                fetch(apiUrl)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('网络响应错误');
                        }
                        return response.json();
                    })
                    .then(data => {
                        servers[index].delay = data.delay || 999;
                        servers[index].status = "online";
                        servers[index].data = data;
                        updateMotdDisplay(data, servers[index], servers);
                    })
                    .catch(error => {
                        console.error(`获取服务器 ${serverAddress} 状态失败:`, error);
                        servers[index].delay = 999;
                        servers[index].status = "offline";
                        displayOfflineStatus(servers[index]);
                    });
            }
        }
    };
});

function updateMotdDisplay(data, currentServer, allServers) {
    const motdContainer = document.getElementById('motdContainer');
    
    if (!data || data.status !== "online") {
        displayOfflineStatus(currentServer);
        return;
    }
    
    let cleanMotd = data.motd || "MSFXP Survival";
    cleanMotd = cleanMotd.replace(/§[0-9a-fklmnor]/gi, '');
    
    let serverSelectorsHtml = '';
    allServers.forEach((server, index) => {
        if (server.isIpv6) return;
        
        const isActive = server.ip === currentServer.ip && server.port === currentServer.port;
        const statusClass = server.status === "online" ? "online" : (server.status === "offline" ? "offline" : "");
        serverSelectorsHtml += `
            <button class="server-selector ${isActive ? 'active' : ''} ${statusClass}" 
                    onclick="switchServer(${index})" 
                    data-server-info='{"index": ${index}, "delay": ${server.delay || 999}, "status": "${server.status}"}'>
                ${server.name}
            </button>
        `;
    });
    
    motdContainer.innerHTML = `
        <div class="motd-header">
            <h2 class="motd-title"><span class="motd-status-indicator motd-online"></span>${cleanMotd}</h2>
        </div>
        
        <div class="server-selectors">
            ${serverSelectorsHtml}
        </div>
        
        <div class="motd-address">${data.host}</div>
        <div class="motd-version">MCBE: ${data.version || "1.20.15"} | Protocol: ${data.agreement || "未知"}</div>
        ${currentServer.note ? `<div class="server-note"><i class="fas fa-exclamation-triangle"></i> ${currentServer.note}</div>` : ''}
        
        <button class="motd-button" onclick="joinServer(${allServers.indexOf(currentServer)})">加入服务器</button>
        
        <div class="motd-info-grid">
            <div class="motd-info-item">
                <i class="fas fa-gamepad"></i>
                <span>游戏模式: ${data.gamemode || "Survival"}</span>
            </div>
            <div class="motd-info-item">
                <i class="fas fa-users"></i>
                <span>在线人数: ${data.online} / ${data.max}</span>
            </div>
            <div class="motd-info-item">
                <i class="fas fa-map"></i>
                <span>地图名: ${data.level_name || cleanMotd}</span>
            </div>
            <div class="motd-info-item">
                <i class="fas fa-tachometer-alt"></i>
                <span>延迟: ${data.delay || "-"} ms</span>
            </div>
        </div>
    `;
}

function joinServer(serverIndex = 0) {
    // 使用页面上已加载的服务器数据
    const mainServers = document.querySelectorAll('[data-server-info]');
    const servers = [
        {
            name: "樱花Frp",
            server_name: "§b§lMSFXP-北方",
            ip: "s1.msfxp.top",
            port: "23236",
            delay: 999
        },
        {
            name: "南方节点",
            server_name: "§b§lMSFXP-南方",
            ip: "s2.msfxp.top",
            port: "19125",
            delay: 999
        },
        {
            name: "日本节点",
            server_name: "§b§lMSFXP-日本",
            ip: "s3.msfxp.top",
            port: "19125",
            delay: 999,
            note: "国内玩家不能访问"
        }
    ];
    
    // 同步全局服务器状态中的延迟数据
    try {
        const parentScope = window.parent || window;
        if (parentScope.document) {
            if (typeof parentScope.servers !== 'undefined') {
                // 可以从上面的全局变量中获取服务器数据
                for (let i = 0; i < Math.min(3, parentScope.servers.length); i++) {
                    if (parentScope.servers[i].status === 'online') {
                        servers[i].delay = parentScope.servers[i].delay || 999;
                        servers[i].status = 'online';
                    } else {
                        servers[i].delay = 999;
                        servers[i].status = 'offline';
                    }
                }
            }
        }
    } catch (e) {
        console.error('获取服务器数据失败', e);
        
        // 备用方法：从DOM中获取主页面已经存在的服务器延迟数据
        try {
            const delayElements = document.querySelectorAll('.motd-info-item .fa-tachometer-alt');
            if (delayElements.length > 0) {
                const delayText = delayElements[0].nextElementSibling.textContent;
                const delayMatch = delayText.match(/(\d+)/);
                if (delayMatch && delayMatch[1]) {
                    const currentDelay = parseInt(delayMatch[1]);
                    // 更新当前显示服务器的延迟
                    servers[serverIndex].delay = currentDelay;
                    servers[serverIndex].status = 'online';
                }
            }
        } catch (e) {
            console.error('获取延迟数据失败', e);
        }
    }
    
    // 查找延迟最低的非IPv6服务器
    let lowestDelayIndex = 0;
    let lowestDelay = 999999;
    
    for (let i = 0; i < 3; i++) { // 考虑所有三个服务器节点
        if (servers[i].status !== 'offline' && servers[i].delay < lowestDelay) {
            lowestDelay = servers[i].delay;
            lowestDelayIndex = i;
        }
    }
    
    // 如果所有服务器都离线，使用当前显示的服务器
    if (lowestDelay === 999999) {
        lowestDelayIndex = serverIndex;
    }
    
    let dialogHTML = `
        <div id="serverSelectDialog" class="server-select-dialog">
            <div class="server-select-content">
                <div class="server-select-header">
                    <h3>选择服务器IP</h3>
                    <span class="close-dialog" onclick="closeServerDialog()">&times;</span>
                </div>
                <div class="server-select-body">
                    <p>请选择要加入的服务器IP：</p>
                    <div class="server-options">`;
    
    servers.forEach((server, idx) => {
        const isRecommended = idx === lowestDelayIndex && !server.isIpv6;
        const delayInfo = server.delay < 999 ? `<div class="server-option-delay">延迟: ${server.delay} ms</div>` : '';
        const statusBadge = server.status === 'offline' ? 
            '<div class="server-option-status offline">离线</div>' : 
            (server.delay < 999 ? '<div class="server-option-status online">在线</div>' : '');
        const overseasBadge = idx === 2 ? '<span class="overseas-badge"><i class="fas fa-globe-asia"></i>海外</span>' : '';
        
        dialogHTML += `
            <div class="server-option ${isRecommended ? 'recommended' : ''} ${server.status === 'offline' ? 'offline' : ''}" 
                 onclick="connectToMinecraft('${server.server_name}', '${server.ip}', '${server.port}')">
                <div class="server-option-name">${server.name} ${isRecommended ? '(推荐)' : ''} ${overseasBadge}</div>
                <div class="server-option-address">${server.ip}:${server.port}</div>
                ${statusBadge}
                ${delayInfo}
                ${server.note ? `<div class="server-option-note"><i class="fas fa-exclamation-triangle"></i> ${server.note}</div>` : ''}
                ${isRecommended ? '<div class="recommended-badge">延迟最低</div>' : ''}
            </div>
        `;
    });
    
    dialogHTML += `
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const dialogContainer = document.createElement('div');
    dialogContainer.id = 'serverDialogContainer';
    dialogContainer.innerHTML = dialogHTML;
    document.body.appendChild(dialogContainer);
    
    window.closeServerDialog = function() {
        const dialog = document.getElementById('serverDialogContainer');
        if (dialog) {
            document.body.removeChild(dialog);
        }
    };
    
    window.connectToMinecraft = function(serverName, serverIP, serverPort) {
        const minecraftLink = `minecraft://?addExternalServer=${serverName}|${serverIP}:${serverPort}`;
        const deviceInfo = detectDevice();
        
        const startTime = Date.now();
        window.location.href = minecraftLink;
        
        // 设置一个超时，如果超过一定时间仍在当前页面，可能是应用未安装
        setTimeout(function() {
            if (Date.now() - startTime < 1500) {
                if (confirm("看起来您可能没有安装Minecraft或无法自动启动。\n是否需要下载Minecraft 1.20.15？")) {
                    showDownloadOptions();
                } else {
                    alert(`如果Minecraft没有自动打开，您可以手动添加服务器。\nIP：${serverIP}\n端口：${serverPort}`);                            
                }
            }
            
            closeServerDialog();
        }, 1000);
    };
}

function displayOfflineStatus(server) {
    const motdContainer = document.getElementById('motdContainer');
    const serverAddress = server ? `${server.ip}:${server.port}` : "s1.msfxp.top:19125";
    
    motdContainer.innerHTML = `
        <div class="motd-header">
            <h2 class="motd-title"><span class="motd-status-indicator motd-offline"></span>服务器离线</h2>
        </div>
        <div class="motd-address">${serverAddress}</div>
        <div class="motd-error">服务器当前无法连接，请稍后再试或切换其他服务器ip</div>
        <div class="server-selectors">
            <button class="server-selector" onclick="switchServer(0)">樱花Frp</button>
            <button class="server-selector" onclick="switchServer(1)">南方节点</button>
            <button class="server-selector" onclick="switchServer(2)">日本节点</button>
        </div>
        <button class="motd-button" onclick="location.reload()">刷新状态</button>
    `;
}

function connectToServer() {
    const personalCenterUrl = "http://map.msfxp.top";
    window.open(personalCenterUrl, "_blank");
}

function showDownloadOptions() {
    const downloadLinks = {
        android: [
            { name: "下载地址1", url: "https://github.akams.cn/https://github.com/yuexps/MSFXP-Web/releases/download/Minecraft/Android.Minecraft_1.20.15.01.APK" },
            { name: "下载地址2", url: "https://tvv.tw/https://github.com/yuexps/MSFXP-Web/releases/download/Minecraft/Android.Minecraft_1.20.15.01.APK" },
            { name: "下载地址3", url: "https://ghfast.top/https://github.com/yuexps/MSFXP-Web/releases/download/Minecraft/Android.Minecraft_1.20.15.01.APK" }
        ],
        ios: [
            { name: "下载地址1", url: "https://github.akams.cn/https://github.com/yuexps/MSFXP-Web/releases/download/Minecraft/iOS.Minecraft_1.20.13.ipa" },
            { name: "下载地址2", url: "https://tvv.tw/https://github.com/yuexps/MSFXP-Web/releases/download/Minecraft/iOS.Minecraft_1.20.13.ipa" },
            { name: "下载地址3", url: "https://ghfast.top/https://github.com/yuexps/MSFXP-Web/releases/download/Minecraft/iOS.Minecraft_1.20.13.ipa" }
        ],
        windows: [
            { name: "下载地址1", url: "https://github.akams.cn/https://github.com/yuexps/MSFXP-Web/releases/download/Minecraft/Windows.MinecraftUWP_1.20.15.Appx" },
            { name: "下载地址2", url: "https://tvv.tw/https://github.com/yuexps/MSFXP-Web/releases/download/Minecraft/Windows.MinecraftUWP_1.20.15.Appx" },
            { name: "下载地址3", url: "https://ghfast.top/https://github.com/yuexps/MSFXP-Web/releases/download/Minecraft/Windows.MinecraftUWP_1.20.15.Appx" }
        ]
    };
    
    // 自动检测设备类型
    const deviceInfo = detectDevice();
    let recommendedPlatform = "android"; // 默认推荐
    
    // 根据设备类型设置推荐平台
    if (deviceInfo.ios) {
        recommendedPlatform = "ios";
    } else if (deviceInfo.windows) {
        recommendedPlatform = "windows";
    } else if (deviceInfo.mac) {
        // Mac平台不推荐任何平台
        recommendedPlatform = "none";
    }
    
    const dialogHTML = `
        <div id="downloadDialog" class="download-dialog">
            <div class="download-dialog-content">
                <div class="download-dialog-header">
                    <h3>选择下载版本</h3>
                    <span class="close-dialog" onclick="closeDownloadDialog()">&times;</span>
                </div>
                <div class="download-dialog-body">
                    <p class="download-intro">请选择适合您设备的Minecraft版本：</p>
                    ${deviceInfo.mac ? '<div class="mac-notice"><i class="fas fa-info-circle"></i><div><span>检测到您正在使用Mac设备，目前暂无Mac版本，您可尝试使用</span> <a href="https://playcover.io" target="_blank" class="tool-link">PlayCover</a> <span>工具安装iOS版本的IPA安装包。</span></div></div>' : ''}
                    <div class="download-options">
                        <div class="download-links-section">
                            <div class="platform-selector">
                                <button class="platform-btn ${!deviceInfo.mac && recommendedPlatform === 'android' ? 'active' : ''}" onclick="switchDownloadPlatform('android')">
                                    <i class="fab fa-android"></i> Android
                                </button>
                                <button class="platform-btn ${deviceInfo.mac || recommendedPlatform === 'ios' ? 'active' : ''}" onclick="switchDownloadPlatform('ios')">
                                    <i class="fab fa-apple"></i> iOS
                                </button>
                                <button class="platform-btn ${!deviceInfo.mac && recommendedPlatform === 'windows' ? 'active' : ''}" onclick="switchDownloadPlatform('windows')">
                                    <i class="fab fa-windows"></i> Windows
                                </button>
                            </div>
                            
                            <div class="download-platform-info">
                                <div id="android-info" class="platform-info-card ${!deviceInfo.mac && recommendedPlatform === 'android' ? 'active' : ''}">
                                    ${recommendedPlatform === 'android' ? '<div class="recommended-badge"><i class="fas fa-check-circle"></i> 推荐</div>' : ''}
                                    <div class="platform-details">
                                        <div class="platform-title">
                                            <div class="platform-icon-large"><i class="fab fa-android"></i></div>
                                            <div>
                                                <div class="platform-name">Android版</div>
                                                <div class="platform-version">Minecraft 1.20.15.01 APK</div>
                                            </div>
                                        </div>
                                        <div class="platform-desc">
                                            <p>适用于所有Android设备，安装后可直接运行。请确保您的设备已开启"安装未知来源应用"选项。</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div id="ios-info" class="platform-info-card ${deviceInfo.mac || recommendedPlatform === 'ios' ? 'active' : ''}">
                                    ${recommendedPlatform === 'ios' ? '<div class="recommended-badge"><i class="fas fa-check-circle"></i> 推荐</div>' : ''}
                                    <div class="platform-details">
                                        <div class="platform-title">
                                            <div class="platform-icon-large"><i class="fab fa-apple"></i></div>
                                            <div>
                                                <div class="platform-name">iOS版</div>
                                                <div class="platform-version">Minecraft 1.20.13 IPA</div>
                                            </div>
                                        </div>
                                        <div class="platform-desc">
                                            <p>适用于iPhone和iPad设备，需使用AltStore或其他工具签名安装。</p>
                                            ${deviceInfo.mac ? '<div class="mac-install-tip"><i class="fas fa-laptop-code"></i> <strong>Mac用户安装提示：</strong> <p>您可以使用<a href="https://playcover.io" target="_blank" class="tool-link">PlayCover</a>工具在Mac上直接运行iOS应用。</p><div class="steps"><div class="step">1. 下载并安装PlayCover</div><div class="step">2. 将下载的IPA文件拖入PlayCover</div><div class="step">3. 按照提示完成安装</div></div></div>' : ''}
                                        </div>
                                    </div>
                                </div>
                                
                                <div id="windows-info" class="platform-info-card ${!deviceInfo.mac && recommendedPlatform === 'windows' ? 'active' : ''}">
                                    ${recommendedPlatform === 'windows' ? '<div class="recommended-badge"><i class="fas fa-check-circle"></i> 推荐</div>' : ''}
                                    <div class="platform-details">
                                        <div class="platform-title">
                                            <div class="platform-icon-large"><i class="fab fa-windows"></i></div>
                                            <div>
                                                <div class="platform-name">Windows版</div>
                                                <div class="platform-version">Minecraft 1.20.15 UWP应用包</div>
                                            </div>
                                        </div>
                                        <div class="platform-desc">
                                            <p>适用于Windows 10/11系统，需要右键点击安装包，选择"安装"选项完成安装。</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="download-links-container">
                                <div class="section-title">选择下载地址</div>
                                <div id="android-links" class="download-links ${!deviceInfo.mac && recommendedPlatform === 'android' ? 'active' : ''}">
                                    ${downloadLinks.android.map((link, index) => 
                                        `<a href="${link.url}" target="_blank" class="download-link">
                                            <span class="link-name">${link.name}</span>
                                            <span class="download-icon"><i class="fas fa-download"></i></span>
                                        </a>`
                                    ).join('')}
                                </div>
                                
                                <div id="ios-links" class="download-links ${deviceInfo.mac || recommendedPlatform === 'ios' ? 'active' : ''}">
                                    ${downloadLinks.ios.map((link, index) => 
                                        `<a href="${link.url}" target="_blank" class="download-link">
                                            <span class="link-name">${link.name}</span>
                                            <span class="download-icon"><i class="fas fa-download"></i></span>
                                        </a>`
                                    ).join('')}
                                </div>
                                
                                <div id="windows-links" class="download-links ${!deviceInfo.mac && recommendedPlatform === 'windows' ? 'active' : ''}">
                                    ${downloadLinks.windows.map((link, index) => 
                                        `<a href="${link.url}" target="_blank" class="download-link">
                                            <span class="link-name">${link.name}</span>
                                            <span class="download-icon"><i class="fas fa-download"></i></span>
                                        </a>`
                                    ).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const dialogContainer = document.createElement('div');
    dialogContainer.id = 'downloadDialogContainer';
    dialogContainer.innerHTML = dialogHTML;
    document.body.appendChild(dialogContainer);
    
    // 防止背景滚动
    document.body.classList.add('dialog-open');
    
    // 阻止对话框内容的滚动事件冒泡到body
    const dialogBody = document.querySelector('.download-dialog-body');
    const dialogContent = document.querySelector('.download-dialog-content');
    
    if (dialogBody && dialogContent) {
        // 阻止触摸事件在对话框上冒泡
        dialogContent.addEventListener('touchstart', function(e) {
            e.stopPropagation();
        }, { passive: false });
        
        dialogContent.addEventListener('touchmove', function(e) {
            e.stopPropagation();
        }, { passive: false });
        
        // 阻止整个对话框的触摸事件冒泡到背景
        document.querySelector('.download-dialog').addEventListener('touchmove', function(e) {
            if (e.target === this) {
                e.preventDefault();
            }
        }, { passive: false });
        
        // 处理对话框内容区域的滚动边界，防止橡皮筋效果
        dialogBody.addEventListener('touchstart', function(e) {
            const scrollTop = this.scrollTop;
            const scrollHeight = this.scrollHeight;
            const height = this.offsetHeight;
            const startY = e.touches[0].pageY;
            
            // 存储初始触摸位置，用于计算滚动方向
            this.dataset.touchStartY = startY;
            
            // 检查是否已经滚动到顶部或底部
            const isAtTop = scrollTop <= 0;
            const isAtBottom = scrollTop + height >= scrollHeight;
            
            // 存储滚动状态
            this.dataset.isAtTop = isAtTop;
            this.dataset.isAtBottom = isAtBottom;
        }, { passive: false });
        
        dialogBody.addEventListener('touchmove', function(e) {
            const startY = parseInt(this.dataset.touchStartY);
            const currentY = e.touches[0].pageY;
            const isScrollingUp = currentY > startY;
            const isScrollingDown = currentY < startY;
            
            // 如果在顶部并且正在向下滚动，或者在底部并且正在向上滚动，则阻止默认行为
            if ((this.dataset.isAtTop === 'true' && isScrollingUp) || 
                (this.dataset.isAtBottom === 'true' && isScrollingDown)) {
                e.preventDefault();
            }
        }, { passive: false });
    }
    
    window.closeDownloadDialog = function() {
        const dialog = document.getElementById('downloadDialogContainer');
        if (dialog) {
            document.body.removeChild(dialog);
            // 恢复背景滚动
            document.body.classList.remove('dialog-open');
        }
    };
    
    window.switchDownloadPlatform = function(platform) {
        // 更新按钮状态
        document.querySelectorAll('.platform-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`.platform-btn:nth-child(${platform === 'android' ? 1 : platform === 'ios' ? 2 : 3})`).classList.add('active');
        
        // 更新平台信息卡片显示
        document.querySelectorAll('.platform-info-card').forEach(card => {
            card.classList.remove('active');
        });
        document.getElementById(`${platform}-info`).classList.add('active');
        
        // 更新下载链接显示
        document.querySelectorAll('.download-links').forEach(links => {
            links.classList.remove('active');
        });
        document.getElementById(`${platform}-links`).classList.add('active');
    };
}

// 检测用户设备类型
function detectDevice() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    
    // 设备信息对象
    const deviceInfo = {
        mobile: false,
        ios: false,
        android: false,
        windows: false,
        mac: false
    };
    
    // 检测移动设备
    if (/android/i.test(userAgent)) {
        deviceInfo.mobile = true;
        deviceInfo.android = true;
    }
    
    // iOS设备检测
    if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
        deviceInfo.mobile = true;
        deviceInfo.ios = true;
    }
    
    // Windows检测
    if (/Windows NT/.test(userAgent)) {
        deviceInfo.windows = true;
    }
    
    // Mac检测
    if (/Macintosh|MacIntel|MacPPC|Mac68K/.test(userAgent)) {
        deviceInfo.mac = true;
    }
    
    return deviceInfo;
}

// 灯箱效果
function openLightbox(index) {
    const galleryItems = document.querySelectorAll('.gallery-item');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    
    if (index >= 0 && index < galleryItems.length) {
        const img = galleryItems[index].querySelector('img');
        if (img) {
            lightbox.style.display = 'flex';
            lightboxImg.src = img.src;
        }
    }
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    lightbox.style.display = 'none';
}

function changeImage(direction) {
    const galleryItems = document.querySelectorAll('.gallery-item');
    const currentIndex = Array.from(galleryItems).findIndex(item => item.querySelector('img').src === document.getElementById('lightbox-img').src);
    const newIndex = (currentIndex + direction + galleryItems.length) % galleryItems.length;
    openLightbox(newIndex);
}

// 轮播图功能
let currentSlide = 0;
const totalSlides = document.querySelectorAll('.gallery-item').length;

function initGallery() {
    // 生成指示点
    const dotsContainer = document.getElementById('galleryDots');
    for (let i = 0; i < totalSlides; i++) {
        const dot = document.createElement('div');
        dot.className = 'gallery-dot' + (i === 0 ? ' active' : '');
        dot.onclick = function() { goToSlide(i); };
        dotsContainer.appendChild(dot);
    }
    
    // 为每个幻灯片项添加点击事件，打开灯箱
    const slides = document.querySelectorAll('.gallery-item');
    slides.forEach((slide, index) => {
        slide.onclick = function() { openLightbox(index); };
    });
    
    // 设置自动轮播
    setInterval(function() {
        slideGallery(1);
    }, 5000);
}

function slideGallery(direction) {
    currentSlide = (currentSlide + direction + totalSlides) % totalSlides;
    updateGallery();
}

function goToSlide(index) {
    currentSlide = index;
    updateGallery();
}

function updateGallery() {
    // 更新轮播位置
    const slidesContainer = document.getElementById('gallerySlides');
    slidesContainer.style.transform = `translateX(-${currentSlide * 100}%)`;
    
    // 更新指示点状态
    const dots = document.querySelectorAll('.gallery-dot');
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === currentSlide);
    });
}

// 加载动画相关函数
function initLoadingAnimation() {
    const loadingScreen = document.getElementById('loading-screen');
    const loadingLetters = document.querySelectorAll('.loading-letter');
    
    // 光效自动通过CSS animation实现
    // 不需要JavaScript控制单个字母的发光
    
    // 可以添加字母鼠标悬停发光效果(可选)
    loadingLetters.forEach(letter => {
        letter.addEventListener('mouseover', function() {
            this.classList.add('glow');
        });
        
        letter.addEventListener('mouseout', function() {
            this.classList.remove('glow');
        });
    });
}

function finishLoadingAnimation() {
    const loadingScreen = document.getElementById('loading-screen');
    const loadingLetters = document.querySelectorAll('.loading-letter');
    
    // 清除所有正在进行的动画
    loadingLetters.forEach(letter => {
        // 停止当前的扫光动画
        letter.style.animation = 'none';
        // 移除可能存在的glow类
        letter.classList.remove('glow');
    });
    
    // 短暂延迟后显示最终动画，确保先清除其他动画
    setTimeout(() => {
        // 所有字母同时发光
        loadingLetters.forEach(letter => {
            // 添加最终发光动画
            letter.style.animation = 'final-glow 1s forwards';
        });
        
        // 同时淡出整个加载屏幕，与字母发光消失同步
        setTimeout(() => {
            loadingScreen.classList.add('fade-out');
            document.body.classList.remove('loading');
        }, 700);
    }, 50);
}
