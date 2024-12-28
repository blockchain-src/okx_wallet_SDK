require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const crypto = require('crypto');

// 配置环境变量
const API_BASE_URL = 'https://www.okx.com';
const API_KEY = process.env.API_KEY;
const SECRET_KEY = process.env.SECRET_KEY;
const PASSPHRASE = process.env.PASSPHRASE;
const PROJECT_ID = process.env.PROJECT_ID;

// 生成签名
function generateSignature(timestamp, method, path, body = '') {
    const preSign = `${timestamp}${method}${path}${body}`;
    return crypto.createHmac('sha256', SECRET_KEY).update(preSign).digest('base64');
}

// 获取当前时间戳
function getTimestamp() {
    return new Date().toISOString();
}

// 构建请求头
function buildHeaders(method, path, body = '') {
    const timestamp = getTimestamp();
    return {
        'Content-Type': 'application/json',
        'OK-ACCESS-PROJECT': PROJECT_ID,
        'OK-ACCESS-KEY': API_KEY,
        'OK-ACCESS-SIGN': generateSignature(timestamp, method, path, body),
        'OK-ACCESS-PASSPHRASE': PASSPHRASE,
        'OK-ACCESS-TIMESTAMP': timestamp,
    };
}

// 发起请求
async function requestAPI(method, endpoint, body = null) {
    const path = `/api/v5${endpoint}`;
    const url = `${API_BASE_URL}${path}`;
    const headers = buildHeaders(method, path, body ? JSON.stringify(body) : '');
    
    const options = {
        method,
        headers,
    };
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    const result = await response.json();
    if (!response.ok) {
        throw new Error(`Error: ${result.msg || response.statusText}`);
    }
    return result;
}

// 获取签名所需数据
async function fetchSignInfo(body) {
    return requestAPI('POST', '/wallet/pre-transaction/sign-info', body);
}

// 请求 Gas Price
async function fetchGasPrice(chainIndex) {
    return requestAPI('GET', `/wallet/pre-transaction/gas-price?chainIndex=${chainIndex}`);
}

// 请求 Gas Limit
async function fetchGasLimit(body) {
    return requestAPI('POST', '/wallet/pre-transaction/gas-limit', body);
}

// 请求 Nonce
async function fetchNonce(chainIndex, address) {
    return requestAPI('GET', `/wallet/pre-transaction/nonce?chainIndex=${chainIndex}&address=${address}`);
}

// 广播交易
async function broadcastTransaction(body) {
    return requestAPI('POST', '/wallet/pre-transaction/broadcast-transaction', body);
}

// 测试脚本主逻辑
(async () => {
    try {
        // 示例参数
        const signInfoBody = {
            chainIndex: '1',
            fromAddr: '0xdf54b6c6195ea4d948d03bfd818d365cf175cfc2',
            toAddr: '0x1e80c39051f078ee34763282cbb36ffd88b40c65',
            txAmount: '123000000000000',
            extJson: {
                inputData: '041bbc6fa102394773c6d8f6d634320773af4',
            },
        };

        const gasLimitBody = {
            fromAddr: '0x383c8208b4711256753b70729ba0cf0cda55efad',
            toAddr: '0x4ad041bbc6fa102394773c6d8f6d634320773af4',
            txAmount: '31600000000000000',
            chainIndex: '1',
            extJson: {
                inputData: '041bbc6fa102394773c6d8f6d634320773af4',
            },
        };

        const broadcastBody = {
            accountId: '5f45a951-4a8b-4cd9-b20a-3b337b71efcc',
            chainIndex: '1',
            address: '0x238193be9e80e68eace3588b45d8cf4a7eae0fa3',
            signedTx: '0x02f8720182029f8411e1a3008504bbe2e94682520894d73c5e36d47eed32f0327f9d3f04b49384e90fab85e8d4a5100080c080a0ba380a9be31efabc4c8cfccbb555f8af3c21073d6eca01f180ebebb8942c6f30a0779e6e16a504c413cb9902ceb33ab7e89a533bc13b74477dfa6b6c76dc41fac2',
        };

        // 执行各个步骤
        console.log('Fetching Sign Info...');
        const signInfo = await fetchSignInfo(signInfoBody);
        console.log('Sign Info:', signInfo);

        console.log('Fetching Gas Price...');
        const gasPrice = await fetchGasPrice('1');
        console.log('Gas Price:', gasPrice);

        console.log('Fetching Gas Limit...');
        const gasLimit = await fetchGasLimit(gasLimitBody);
        console.log('Gas Limit:', gasLimit);

        console.log('Fetching Nonce...');
        const nonce = await fetchNonce('1', '0xdf54b6c6195ea4d948d03bfd818d365cf175cfc2');
        console.log('Nonce:', nonce);

        console.log('Broadcasting Transaction...');
        const broadcastResult = await broadcastTransaction(broadcastBody);
        console.log('Broadcast Result:', broadcastResult);
    } catch (error) {
        console.error('Error:', error.message);
    }
})();
