//  _____                    _ _ _                   ____        _   
// |_   _| __ __ ___   _____| | (_)_ __   __ _ ___  | __ )  ___ | |_ 
//   | || '__/ _` \ \ / / _ \ | | | '_ \ / _` / __| |  _ \ / _ \| __|
//   | || | | (_| |\ V /  __/ | | | | | | (_| \__ \ | |_) | (_) | |_ 
//   |_||_|  \__,_| \_/ \___|_|_|_|_| |_|\__, |___/ |____/ \___/ \__|
//                                       |___/                       
//
// By @BLxcwg666 <huixcwg@gmail.com / TG @xcnya>
// Version 1.24 / 2023/9/16 17:44 Lastest
// "你说他出 Bug 了吗，到底出没出，出没出，如出"

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const mysql = require('mysql2/promise');
const moment = require('moment');

// ASCII艺术字
var figlet = require('figlet');

figlet('Travellings Bot', function (err, data) {
    if (err) {
        console.log('Something went wrong...');
        console.dir(err);
        return;
    }
    console.log(data)
    console.log("");
    console.log("Travellings Bot <v 1.24> // Cpoyright (C) 2020-2023 Travellings-link Project.");
    console.log("");
    console.log(">> 开始检测站点");
    console.log("");
});

// 创建 logs（如果没有）
const logsFolderPath = path.join(__dirname, 'logs');
if (!fs.existsSync(logsFolderPath)) {
  fs.mkdirSync(logsFolderPath);
}

// MySQL
const dbConfig = {
  host: '127.0.0.1',
  port: '3306',
  user: 'root',
  password: 'nekodayo2333@',
  database: 'travellings',
};

// Axios
const axiosConfig = {
  timeout: 30000, // 超时时间默认 30 秒，有需要自己改
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; Travellings Bot/1.24; +https://www.travellings.cn/docs/qa)',
  },
};

async function crawlAndCheck() {
  const connection = await mysql.createConnection(dbConfig);

  try {
    // 查表
    const [rows] = await connection.query('SELECT * FROM webs');

    // 时间
    const currentTimeForFileName = moment().format('YYYY-MM-DD HH_mm_ss');
    
    // 写 log
    const logFileName = `${currentTimeForFileName}.log`;
    const logFilePath = path.join(logsFolderPath, logFileName);
    const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

    for (const row of rows) {
      let statusReason = ''; // 存储判定原因
      try {
        const response = await axios.get(row.link, axiosConfig);

        // 检查相应 html 体
        if (response.data.includes('travellings')) {
          // 有就有
          await connection.query('UPDATE webs SET status = ? WHERE indexs = ?', ['RUN', row.indexs]);
          statusReason = '包含所需字段，状态已更新为 RUN';
        } else {
          // 没有就没有
          await connection.query('UPDATE webs SET status = ? WHERE indexs = ?', ['LOST', row.indexs]);
          statusReason = '不包含所需字段，状态已更新为 LOST';
        }
      } catch (error) {
        // 不正常情况
        if (error.response) {
          // 4xx or 5xx
          await connection.query('UPDATE webs SET status = ? WHERE indexs = ?', [error.response.status, row.indexs]);
          statusReason = `请求返回 ${error.response.status} 状态码，状态已更新为 ${error.response.status}`;
        } else if (error.code === 'ECONNABORTED') {
          // 你超时了
          await connection.query('UPDATE webs SET status = ? WHERE indexs = ?', ['TIMEOUT', row.indexs]);
          statusReason = '请求超时，状态已更新为 TIMEOUT';
        } else {
          // 其他疑难杂症归为 ERROR
          await connection.query('UPDATE webs SET status = ? WHERE indexs = ?', ['ERROR', row.indexs]);
          statusReason = '请求出错，状态已更新为 ERROR';
        }
      }

      // 开机时间，用于日志命名
      const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
      
      // log
      const logEntry = `[${currentTime}] 站点 ${row.link} 检测完成，${statusReason}`;
      console.log(logEntry);
      logStream.write(`${logEntry}\n`);
    }

    // 关了log
    logStream.end();
  } catch (err) {
    console.error('Error:', err);
  } finally {
    // 关闭数据库连接
    connection.close();
  }
}

// 开机
crawlAndCheck();

// 每隔 5 小时一次循环，有需要自己改
setInterval(crawlAndCheck, 5 * 60 * 60 * 1000);
