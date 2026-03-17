// 生成详细训练提醒内容
// 读取每周训练计划文件，提取当天的详细内容

const fs = require('fs');
const path = require('path');

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function parseTrainingPlan(weekNumber, weekday) {
  const weekStr = weekNumber.toString().padStart(2, '0');
  const filePath = path.join(__dirname, '..', 'memory', 'fitness', 'weekly', `2026-W${weekStr}.md`);
  
  // 如果找不到当年的文件，尝试读取最新的周计划
  let content = '';
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    // 读取默认模板
    return getDefaultTraining(weekday);
  }
  
  // 解析当天的训练内容
  const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const dayName = dayNames[weekday];
  
  // 查找当天的训练内容
  const regex = new RegExp(`## ${dayName}.*?(?=##|$)`, 's');
  const match = content.match(regex);
  
  if (match) {
    return parseDayContent(match[0]);
  }
  
  return getDefaultTraining(weekday);
}

function parseDayContent(content) {
  const lines = content.split('\n').filter(line => line.trim());
  
  let mainTraining = '';
  let keyPoints = [];
  let extraTraining = '';
  let recovery = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.includes('**主课**') || line.includes('主课')) {
      mainTraining = line.replace(/\*\*主课\*\*[:：]?/, '').trim();
    } else if (line.includes('**执行要点**') || line.includes('执行要点')) {
      // 收集执行要点
      let j = i + 1;
      while (j < lines.length && lines[j].trim().startsWith('-')) {
        keyPoints.push(lines[j].replace(/^-\s*/, '').trim());
        j++;
      }
    } else if (line.includes('**加练**') || line.includes('加练')) {
      extraTraining = line.replace(/\*\*加练\*\*[:：]?/, '').trim();
    } else if (line.includes('**恢复重点**') || line.includes('恢复重点')) {
      recovery = line.replace(/\*\*恢复重点\*\*[:：]?/, '').trim();
    }
  }
  
  return {
    mainTraining,
    keyPoints,
    extraTraining,
    recovery
  };
}

function getDefaultTraining(weekday) {
  const trainings = [
    '周日：休息',
    '周一：Back Squat + OVERTAKE',
    '周二：Bench Press + DRS',
    '周三：Squat Body Strength + Clean Pulls',
    '周四：Push Press + Safety Car',
    '周五：Hang Squat Snatch + Pole Position',
    '周六：THE OPEN 2026'
  ];
  
  return {
    mainTraining: trainings[weekday],
    keyPoints: [],
    extraTraining: '',
    recovery: ''
  };
}

function generateMessage(date, training) {
  const dateStr = date.toISOString().split('T')[0];
  const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const dayName = dayNames[date.getDay()];
  
  let message = `## 🏋️ DIMI训练提醒 (${dateStr} ${dayName})\n\n`;
  
  // 主课
  message += `### 📋 今日主课\n${training.mainTraining}\n\n`;
  
  // 执行要点
  if (training.keyPoints.length > 0) {
    message += `### 🎯 执行要点\n`;
    training.keyPoints.forEach(point => {
      message += `- ${point}\n`;
    });
    message += `\n`;
  }
  
  // 加练
  if (training.extraTraining) {
    message += `### 💪 加练安排\n${training.extraTraining}\n\n`;
  }
  
  // 恢复重点
  if (training.recovery) {
    message += `### 🧘 恢复重点\n${training.recovery}\n\n`;
  }
  
  // 温馨提示
  message += `### 💡 温馨提示\n`;
  message += `1. 记得查看睡眠数据分析\n`;
  message += `2. 根据体感调整训练强度\n`;
  message += `3. 训练后及时反馈\n\n`;
  message += `> 💪 加油！\n`;
  message += `> 📊 查看睡眠数据：https://dimi-sleep-form.vercel.app/`;
  
  return message;
}

// 主函数
function main() {
  const now = new Date();
  // 转换为北京时间 (UTC+8)
  const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  
  const weekNumber = getWeekNumber(beijingTime);
  const weekday = beijingTime.getDay();
  
  console.log(`Generating training reminder for Week ${weekNumber}, Day ${weekday}`);
  
  const training = parseTrainingPlan(weekNumber, weekday);
  const message = generateMessage(beijingTime, training);
  
  // 输出到标准输出，供GitHub Actions使用
  console.log('\n=== MESSAGE START ===');
  console.log(message);
  console.log('=== MESSAGE END ===');
  
  // 设置环境变量供后续步骤使用
  console.log(`::set-output name=message::${message.replace(/\n/g, '%0A')}`);
}

main();
