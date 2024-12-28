const fs = require('fs');
const https = require('https');
const crypto = require('crypto');
require('dotenv').config();

// 从 .env 文件加载 API 凭证
const apiConfig = {
  apiKey: process.env.OK_ACCESS_KEY,
  secretKey: process.env.OK_ACCESS_SECRET,
  passphrase: process.env.OK_ACCESS_PASSPHRASE,
  project: process.env.OK_ACCESS_PROJECT || '', // 可选
};

// 从文件读取地址列表
const addressesFilePath = './addresses.txt';
const addresses = fs.readFileSync(addressesFilePath, 'utf-8').trim().split('\n');

// 签名辅助函数
function createSignature(method, requestPath, params) {
  const timestamp = new Date().toISOString();
  const queryString = method === 'POST' ? JSON.stringify(params) : '';
  const preHash = `${timestamp}${method}${requestPath}${queryString}`;
  const signature = crypto
    .createHmac('sha256', apiConfig.secretKey)
    .update(preHash)
    .digest('base64');
  return { signature, timestamp };
}

// 发送 GET 请求
function sendGetRequest(requestPath, params, callback) {
  const { signature, timestamp } = createSignature('GET', requestPath, params);
  const headers = {
    'OK-ACCESS-KEY': apiConfig.apiKey,
    'OK-ACCESS-SIGN': signature,
    'OK-ACCESS-TIMESTAMP': timestamp,
    'OK-ACCESS-PASSPHRASE': apiConfig.passphrase,
    'OK-ACCESS-PROJECT': apiConfig.project,
  };

  const url = `https://www.okx.com${requestPath}?${new URLSearchParams(params).toString()}`;
  https.get(url, { headers }, (res) => {
    let data = '';
    res.on('data', (chunk) => (data += chunk));
    res.on('end', () => callback(null, JSON.parse(data)));
  }).on('error', (err) => callback(err));
}

// 查询总资产并保存结果
async function queryAndSaveResults() {
  const results = [];
  for (const address of addresses) {
    const requestPath = '/api/v5/wallet/asset/total-value-by-address';
    const params = {
      address,
      chains: '1', // 根据需求设置链 ID
      assetType: '0', // 查询所有资产
      excludeRiskToken: true, // 过滤空投代币
    };

    console.log(`查询地址: ${address}`);
    await new Promise((resolve) => {
      sendGetRequest(requestPath, params, (err, data) => {
        if (err) {
          console.error(`地址 ${address} 查询失败:`, err);
        } else if (data && data.code === '0') {
          results.push({ address, totalValue: data.data[0].totalValue });
        } else {
          console.error(`地址 ${address} 查询失败，返回:`, data);
        }
        resolve();
      });
    });
  }

  // 保存结果到文件
  fs.writeFileSync('./results.json', JSON.stringify(results, null, 2), 'utf-8');
  console.log('查询结果已保存到 results.json');
}

// 开始查询
queryAndSaveResults();
