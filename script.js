// 初始化函数
document.addEventListener('DOMContentLoaded', function() {
    // 模拟加载
    setTimeout(() => {
        document.getElementById('loading').style.display = 'none';
    }, 2000);

    // 初始化音乐控制
    initMusicControl();
    
    // 初始化滚动动画
    initScrollAnimation();
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

// 初始化滚动动画
function initScrollAnimation() {
    const timelineItems = document.querySelectorAll('.timeline-item');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.3,
        rootMargin: '0px 0px -50px 0px'
    });
    
    timelineItems.forEach(item => {
        observer.observe(item);
    });
    
    // 页面滚动时自动播放音乐
    let musicPlayed = false;
    
    window.addEventListener('scroll', function() {
        if (!musicPlayed && window.scrollY > 100) {
            const bgMusic = document.getElementById('bgMusic');
            bgMusic.play().then(() => {
                document.getElementById('musicToggle').textContent = '🔊';
                musicPlayed = true;
            }).catch(e => {
                console.log('自动播放失败:', e);
            });
        }
    });
}

// 添加一些交互效果
document.addEventListener('DOMContentLoaded', function() {
    // 为所有卡片添加悬停效果
    const cards = document.querySelectorAll('.timeline-content, .memory-card, .detail-item');
    
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
            this.style.boxShadow = '0 15px 40px rgba(0, 0, 0, 0.15)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.1)';
        });
    });
    
    // 点击封面滚动到内容
    document.querySelector('.cover-section').addEventListener('click', function() {
        window.scrollTo({
            top: window.innerHeight,
            behavior: 'smooth'
        });
    });
});
