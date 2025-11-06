// === 可配置：婚礼日期（用于日历与倒计时） ===
const WEDDING_DATE = new Date(2025, 11, 20); // 注意：月份从 0 开始，11=12月

document.addEventListener('DOMContentLoaded', () => {
  renderCalendar(WEDDING_DATE);
  startCountdown(WEDDING_DATE);
});

// 渲染日历，仅展示婚礼所在月份
function renderCalendar(date){
  const y = date.getFullYear();
  const m = date.getMonth(); // 0-11
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  const $cal = document.getElementById('calendar');
  const $year = document.getElementById('cal-year');
  const $month = document.getElementById('cal-month');

  if($year) $year.textContent = y;
  if($month) $month.textContent = m + 1;

  const weekdayNames = ['日','一','二','三','四','五','六'];
  $cal.innerHTML = '';

  // 星期标题
  weekdayNames.forEach(w => {
    const wd = document.createElement('div');
    wd.className = 'wd';
    wd.textContent = w;
    $cal.appendChild(wd);
  });

  // 空白补位
  for(let i = 0; i < first.getDay(); i++){
    const blank = document.createElement('div');
    $cal.appendChild(blank);
  }

  // 日期
  for(let d = 1; d <= last.getDate(); d++){
    const cell = document.createElement('div');
    cell.className = 'day';
    cell.textContent = d;

    const today = new Date();
    if (y === today.getFullYear() && m === today.getMonth() && d === today.getDate()){
      cell.classList.add('today');
    }
    if (d === date.getDate()){
      cell.classList.add('event');
      cell.title = '婚礼当天';
    }
    $cal.appendChild(cell);
  }
}

// 倒计时
function startCountdown(targetDate){
  const el = document.getElementById('countdown');
  if(!el) return;

  function tick(){
    const now = new Date();
    const diff = targetDate - now;

    if (diff <= 0){
      el.textContent = '今天见！';
      return;
    }
    const days = Math.floor(diff / (1000*60*60*24));
    const hours = Math.floor(diff / (1000*60*60)) % 24;
    const mins = Math.floor(diff / (1000*60)) % 60;

    el.textContent = `还有 ${days} 天 ${hours} 小时 ${mins} 分`;
    requestAnimationFrame(() => setTimeout(tick, 1000));
  }
  tick();
}

// 地图示例（你可以换成真实地图链接）
function openMap(e){
  e.preventDefault();
  const query = encodeURIComponent('幸福酒店 三楼宴会厅 杭州市 西湖区 桃源路 18 号');
  window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
}

// RSVP 简单前端反馈
function handleRSVP(e){
  e.preventDefault();
  const form = e.target;
  const name = form.name.value.trim();
  const count = form.count.value;
  const result = document.getElementById('rsvp-result');

  if(!name){
    result.textContent = '请填写姓名噢～';
    return false;
  }

  result.textContent = `收到啦，${name}（${count}人）。期待与你相见！`;
  form.reset();
  return false;
}

// 平滑滚动
function scrollToRSVP(e){
  e.preventDefault();
  document.querySelector('#rsvp').scrollIntoView({ behavior:'smooth', block:'start' });
}
