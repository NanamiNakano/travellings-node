//  _____                    _ _ _                   ____        _   
// |_   _| __ __ ___   _____| | (_)_ __   __ _ ___  | __ )  ___ | |_ 
//   | || '__/ _` \ \ / / _ \ | | | '_ \ / _` / __| |  _ \ / _ \| __|
//   | || | | (_| |\ V /  __/ | | | | | | (_| \__ \ | |_) | (_) | |_ 
//   |_||_|  \__,_| \_/ \___|_|_|_|_| |_|\__, |___/ |____/ \___/ \__|
//                                       |___/                       
//
// By @BLxcwg666 <huixcwg@gmail.com / TG @xcnya>
// Version 1.26 / 2023/9/18 23:35 Lastest
// "阿巴阿巴阿巴"

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const mysql = require('mysql2/promise');
const moment = require('moment');
const dotenv = require('dotenv');

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
    console.log("Travellings Bot <v 1.26> // Cpoyright (C) 2020-2023 Travellings-link Project.");
    console.log("");
    console.log(">> 开始检测站点");
    console.log("");
});

// 创建 Botlogs（如果没有）
const BotlogsFolderPath = path.join(__dirname, 'Botlogs');
if (!fs.existsSync(BotlogsFolderPath)) {
  fs.mkdirSync(BotlogsFolderPath);
}

// MySQL
dotenv.config();
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  port: process.env.DB_PORT,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

// Axios
const axiosConfig = {
  timeout: 30000, // 超时时间默认 30 秒，有需要自己改
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; Travellings Bot/1.26; +https://www.travellings.cn/docs/qa)',
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
    const logFilePath = path.join(BotlogsFolderPath, logFileName);
    const Botlogstream = fs.createWriteStream(logFilePath, { flags: 'a' });

    for (const row of rows) {
      let statusReason = ''; // 存储判定原因
      try {
        const response = await axios.get(row.link, axiosConfig);

        // 检查相应 html 体
        if (response.data.includes('travellings.cn/go')) {
          // 有就有
          await connection.query('UPDATE webs SET status = ? WHERE indexs = ?', ['RUN', row.indexs]);
          statusReason = '>> RUN';
        } else {
          // 没有就没有
          await connection.query('UPDATE webs SET status = ? WHERE indexs = ?', ['LOST', row.indexs]);
          statusReason = '>> LOST';
        }
      } catch (error) {
        // 不正常情况
        if (error.response) {
          // 4xx or 5xx
          await connection.query('UPDATE webs SET status = ? WHERE indexs = ?', [error.response.status, row.indexs]);
          statusReason = `>> ${error.response.status}`;
        } else if (error.code === 'ECONNABORTED') {
          // 你超时了
          await connection.query('UPDATE webs SET status = ? WHERE indexs = ?', ['TIMEOUT', row.indexs]);
          statusReason = '>> TIMEOUT';
        } else {
          // 其他疑难杂症归为 ERROR
          await connection.query('UPDATE webs SET status = ? WHERE indexs = ?', ['ERROR', row.indexs]);
          statusReason = '>> ERROR';
        }
      }

      // 开机时间，用于日志命名
      const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
      
      // log
      const logEntry = `[${currentTime}] 站点 ${row.link} 检测完成 ${statusReason}`;
      console.log(logEntry);
      Botlogstream.write(`${logEntry}\n`);
    }

    // 关了log
    Botlogstream.end();
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
