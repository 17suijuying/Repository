// 初始化函数
document.addEventListener('DOMContentLoaded', function() {
    // 模拟加载
    setTimeout(() => {
        document.getElementById('loading').style.display = 'none';
    }, 2000);

    // 初始化留言
    loadMessages();
    
    // 表单提交处理
    document.getElementById('rsvpForm').addEventListener('submit', handleFormSubmit);
    
    // 初始化音乐控制
    initMusicControl();
});

// 初始化音乐控制
function initMusicControl() {
    const musicToggle = document.getElementById('musicToggle');
    const bgMusic = document.getElementById('bgMusic');
    
    // 设置音乐参数
    bgMusic.volume = 0.3;
    
    // 音乐切换按钮事件
    musicToggle.addEventListener('click', function() {
        if (bgMusic.paused) {
            bgMusic.play().then(() => {
                musicToggle.textContent = '🔊';
            }).catch(e => {
                console.log('音乐播放失败:', e);
            });
        } else {
            bgMusic.pause();
            musicToggle.textContent = '🔇';
        }
    });
}

// 进入网站并播放音乐
function enterSite() {
    const cover = document.getElementById('cover');
    const mainContent = document.getElementById('mainContent');
    const bgMusic = document.getElementById('bgMusic');
    const musicToggle = document.getElementById('musicToggle');
    
    // 先播放音乐（用户点击按钮触发的，符合自动播放策略）
    bgMusic.play().then(() => {
        console.log('音乐开始播放');
        musicToggle.textContent = '🔊';
    }).catch(e => {
        console.log('音乐播放失败:', e);
        // 如果播放失败，显示提示
        alert('音乐播放失败，请检查音乐文件路径或浏览器设置');
    });
    
    // 然后显示主要内容
    cover.style.opacity = '0';
    cover.style.transform = 'translateY(-20px)';
    
    setTimeout(() => {
        cover.style.display = 'none';
        mainContent.classList.remove('hidden');
        mainContent.classList.add('fade-in');
    }, 500);
}

// 处理表单提交
function handleFormSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const guestData = {
        name: formData.get('guestName'),
        count: formData.get('guestCount'),
        message: formData.get('guestMessage'),
        timestamp: new Date().toLocaleString('zh-CN')
    };
    
    // 保存到本地存储
    saveMessage(guestData);
    
    // 添加到留言墙
    addMessageToWall(guestData);
    
    // 清空表单
    event.target.reset();
    
    // 显示成功消息
    alert('感谢您的回复！我们期待您的到来！');
}

// 保存留言到本地存储
function saveMessage(message) {
    let messages = JSON.parse(localStorage.getItem('weddingMessages') || '[]');
    messages.push(message);
    localStorage.setItem('weddingMessages', JSON.stringify(messages));
}

// 从本地存储加载留言
function loadMessages() {
    const messages = JSON.parse(localStorage.getItem('weddingMessages') || '[]');
    const container = document.getElementById('messagesContainer');
    
    if (messages.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999;">还没有留言，快来送上祝福吧！</p>';
        return;
    }
    
    // 按时间倒序显示
    messages.reverse().forEach(message => {
        addMessageToWall(message, false);
    });
}

// 添加留言到留言墙
function addMessageToWall(message, animate = true) {
    const container = document.getElementById('messagesContainer');
    
    // 如果当前显示的是空状态提示，先清除
    if (container.querySelector('p')) {
        container.innerHTML = '';
    }
    
    const messageElement = document.createElement('div');
    messageElement.className = 'message-item';
    if (animate) {
        messageElement.classList.add('fade-in');
    }
    
    messageElement.innerHTML = `
        <div class="message-header">
            <span class="message-name">${message.name}</span>
            <span class="message-time">${message.timestamp}</span>
        </div>
        <div class="message-content">
            <p>${message.message || '送上最真挚的祝福！'}</p>
            ${message.count ? `<p><small>参加人数：${message.count}人</small></p>` : ''}
        </div>
    `;
    
    container.insertBefore(messageElement, container.firstChild);
}

// 页面滚动效果
let lastScrollTop = 0;
const sections = document.querySelectorAll('.section');

function checkScroll() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        
        if (scrollTop > sectionTop - window.innerHeight + 100) {
            section.style.opacity = '1';
            section.style.transform = 'translateY(0)';
        }
    });
    
    lastScrollTop = scrollTop;
}

// 初始化滚动监听
window.addEventListener('scroll', checkScroll);

// 预加载图片函数（可选）
function preloadImages() {
    const images = [
        'images/couple-1.jpg',
        'images/couple-2.jpg'
    ];
    
    images.forEach(src => {
        const img = new Image();
        img.src = src;
    });
}

// 调用预加载
preloadImages();
