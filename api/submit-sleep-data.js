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
    const axios = require('axios');
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
    const url = `https://gitee.com/api/v5/repos/shws2011/dimi/contents/${filePath}`;
    const encodedContent = Buffer.from(fileContent).toString('base64');
    
    const data = {
      access_token: GITEE_TOKEN,
      content: encodedContent,
      message: `睡眠数据提交 - ${body.date}`,
      branch: 'main'
    };

    try {
      const response = await axios.post(url, data);
      return res.status(200).json({ success: true, data: response.data });
    } catch (error) {
      if (error.response && error.response.status === 422) {
        const getUrl = `${url}?access_token=${GITEE_TOKEN}&ref=main`;
        const getResponse = await axios.get(getUrl);
        data.sha = getResponse.data.sha;
        const updateResponse = await axios.put(url, data);
        return res.status(200).json({ success: true, data: updateResponse.data });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
