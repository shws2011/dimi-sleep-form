module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ message: 'OK' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const https = require('https');
    const body = req.body;
    const GITEE_TOKEN = process.env.GITEE_TOKEN;

    const requiredFields = ['date', 'sleepDuration', 'awakePercentage', 'remSleep', 
                           'lightSleep', 'deepSleep', 'awake5minCount', 'restingHeartRate',
                           'hrv', 'weight', 'bodyFat'];
    
    for (const field of requiredFields) {
      if (!(field in body)) {
        return res.status(400).json({ error: `Missing field: ${field}` });
      }
    }
    
    const fileContent = JSON.stringify(body, null, 2);
    const filePath = `memory/fitness/sleep_inputs/sleep_${body.date.replace(/-/g, '')}.json`;
    
    const data = {
      access_token: GITEE_TOKEN,
      content: Buffer.from(fileContent).toString('base64'),
      message: `睡眠数据提交 - ${body.date}`,
      branch: 'main'
    };
    
    // 创建文件
    const result = await new Promise((resolve, reject) => {
      const postData = JSON.stringify(data);
      const options = {
        hostname: 'gitee.com',
        path: `/api/v5/repos/shws2011/dimi/contents/${encodeURIComponent(filePath)}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };
    
      const request = https.request(options, (response) => {
        let responseData = '';
        response.on('data', (chunk) => responseData += chunk);
        response.on('end', () => {
          resolve({ statusCode: response.statusCode, data: responseData });
        });
      });
    
      request.on('error', reject);
      request.write(postData);
      request.end();
    });
    
    if (result.statusCode === 201) {
      return res.status(200).json({ success: true, message: '数据提交成功' });
    } else if (result.statusCode === 422) {
      // 文件已存在，更新
      const getResult = await new Promise((resolve, reject) => {
        const options = {
          hostname: 'gitee.com',
          path: `/api/v5/repos/shws2011/dimi/contents/${encodeURIComponent(filePath)}?access_token=${GITEE_TOKEN}&ref=main`,
          method: 'GET'
        };
        const request = https.request(options, (response) => {
          let data = '';
          response.on('data', (chunk) => data += chunk);
          response.on('end', () => resolve(JSON.parse(data)));
        });
        request.on('error', reject);
        request.end();
      });
    
      data.sha = getResult.sha;
      const updateResult = await new Promise((resolve, reject) => {
        const postData = JSON.stringify(data);
        const options = {
          hostname: 'gitee.com',
          path: `/api/v5/repos/shws2011/dimi/contents/${encodeURIComponent(filePath)}`,
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          }
        };
        const request = https.request(options, (response) => {
          let responseData = '';
          response.on('data', (chunk) => responseData += chunk);
          response.on('end', () => resolve({ statusCode: response.statusCode }));
        });
        request.on('error', reject);
        request.write(postData);
        request.end();
      });
    
      if (updateResult.statusCode === 200) {
        return res.status(200).json({ success: true, message: '数据更新成功' });
      }
    }
    
    throw new Error(`Gitee API error: ${result.statusCode}`);

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
