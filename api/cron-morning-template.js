// 每日9:00发送晨间模板
// Vercel Cron Job - 北京时间9:00 = UTC 1:00
const https = require('https');

module.exports = async (req, res) => {
  // 验证Cron请求（Vercel自动添加的Authorization头）
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 调用钉钉机器人发送晨间模板
    const result = await sendDingTalkMessage();
    return res.status(200).json({ success: true, message: '晨间模板已发送', result });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
};

function sendDingTalkMessage() {
  return new Promise((resolve, reject) => {
    const DINGTALK_WEBHOOK = 'https://oapi.dingtalk.com/robot/send?access_token=238cbb8ff13ea9a2ac8567a4e2c185303804906107d9bc73bb209e5584c211c9';
    
    const today = new Date().toLocaleDateString('zh-CN');
    const message = {
      msgtype: 'markdown',
      markdown: {
        title: `DIMI晨间模板 - ${today}`,
        text: `## 🌅 DIMI晨间模板 (${today})\n\n### 💤 昨晚睡眠\n- 睡眠时长：____小时\n- 清醒比例：____%\n- REM比例：____%\n- 浅睡比例：____%\n- 深睡比例：____%\n- 清醒5分钟次数：____次\n- 静息心率：____bpm\n\n### 📊 生理指标\n- HRV：____ms\n- 体重：____kg\n- 体脂率：____%\n\n### 🏋️ 今日训练\n- 训练类型：____\n- 目标强度：____\n- 预计时长：____分钟\n\n### 💪 身体状态\n- 疲劳程度：____/10\n- 肌肉酸痛：____/10\n- 精神状态：____/10\n\n### 🎯 今日目标\n1. ____\n2. ____\n3. ____\n\n> 💡 请填写后访问：https://dimi-sleep-form.vercel.app/`
      }
    };

    const postData = JSON.stringify(message);
    const url = new URL(DINGTALK_WEBHOOK);
    
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const request = https.request(options, (response) => {
      let data = '';
      response.on('data', (chunk) => data += chunk);
      response.on('end', () => {
        const result = JSON.parse(data);
        if (result.errcode === 0) {
          resolve(result);
        } else {
          reject(new Error(`DingTalk error: ${result.errmsg}`));
        }
      });
    });

    request.on('error', reject);
    request.write(postData);
    request.end();
  });
}
