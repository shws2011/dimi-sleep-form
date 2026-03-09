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
    const body = req.body;
    const GITEE_TOKEN = process.env.GITEE_TOKEN;
    
    console.log('Received body:', JSON.stringify(body));
    
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
    
    console.log('File path:', filePath);
    
    // 使用原生https模块
    const https = require('https');
    
    const data = {
      access_token: GITEE_TOKEN,
      content: Buffer.from(fileContent).toString('base64'),
      message: `睡眠数据提交 - ${body.date}`,
      branch: 'main'
    };

    // 先尝试创建文件
    const createResult = await new Promise((resolve, reject) => {
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
        response.on('data', (chunk) => {
          responseData += chunk;
        });
        response.on('end', () => {
          console.log('Create response:', response.statusCode, responseData);
          resolve({
            statusCode: response.statusCode,
            data: responseData
          });
        });
      });

      request.on('error', (error) => {
        reject(error);
      });

      request.write(postData);
      request.end();
    });

    // 如果文件已存在（422），则更新
    if (createResult.statusCode === 422) {
      console.log('File exists, getting SHA...');
      
      // 获取文件SHA
      const fileInfo = await new Promise((resolve, reject) => {
        const options = {
          hostname: 'gitee.com',
          path: `/api/v5/repos/shws2011/dimi/contents/${encodeURIComponent(filePath)}?ref=main`,
          method: 'GET',
          headers: {
            'Authorization': `token ${GITEE_TOKEN}`
          }
        };
        
        const request = https.request(options, (response) => {
          let data = '';
          response.on('data', (chunk) => {
            data += chunk;
          });
          response.on('end', () => {
            console.log('Get file response:', response.statusCode);
            if (response.statusCode === 200) {
              resolve(JSON.parse(data));
            } else {
              reject(new Error(`Failed to get file: ${data}`));
            }
          });
        });
        
        request.on('error', reject);
        request.end();
      });
      
      // 更新文件
      data.sha = fileInfo.sha;
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
          response.on('data', (chunk) => {
            responseData += chunk;
          });
          response.on('end', () => {
            console.log('Update response:', response.statusCode);
            resolve({
              statusCode: response.statusCode,
              data: responseData
            });
          });
        });
        
        request.on('error', reject);
        request.write(postData);
        request.end();
      });
      
      if (updateResult.statusCode === 200) {
        return res.status(200).json({ success: true, message: '数据更新成功' });
      } else {
        throw new Error(`Update failed: ${updateResult.data}`);
      }
    } else if (createResult.statusCode === 201) {
      return res.status(200).json({ success: true, message: '数据提交成功' });
    } else {
      throw new Error(`Create failed: ${createResult.data}`);
    }

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
