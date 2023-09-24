//  _____                    _ _ _                   ____        _   
// |_   _| __ __ ___   _____| | (_)_ __   __ _ ___  | __ )  ___ | |_ 
//   | || '__/ _` \ \ / / _ \ | | | '_ \ / _` / __| |  _ \ / _ \| __|
//   | || | | (_| |\ V /  __/ | | | | | | (_| \__ \ | |_) | (_) | |_ 
//   |_||_|  \__,_| \_/ \___|_|_|_|_| |_|\__, |___/ |____/ \___/ \__|
//                                       |___/                       
//
// By @BLxcwg666 <huixcwg@gmail.com / TG @xcnya>
// Headless Browser / Version 1.12 / 2023/9/24 12:29 Lastest
// "你没有舍不得，我也不好意思难过。"

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const moment = require('moment');
const dotenv = require('dotenv');
const { Builder, By, Key, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

const tempDir = './temp';
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

dotenv.config();

// ASCII艺术字
var figlet = require('figlet');

// 创建 Botlogs（如果没有）
const BotlogsFolderPath = path.join(__dirname, 'Botlogs');
if (!fs.existsSync(BotlogsFolderPath)) {
  fs.mkdirSync(BotlogsFolderPath);
}

// MySQL
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  port: process.env.DB_PORT,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

// Axios
// const axiosConfig = {
//  timeout: 30000, // 超时时间默认 30 秒，有需要自己改
//  headers: {
//    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
//    'Accept-Encoding': 'gzip, deflate, br',
//    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
//    'Cache-Control': 'max-age=0',
//    'Sec-Ch-Ua': '`Chromium`;v=`116`, `Not)A;Brand`;v=`24`, `Google Chrome`;v=`116`',
//    'Sec-Ch-Ua-Mobile': '?0',
//    'Sec-Ch-Ua-Platform': '`Windows`',
//    'Sec-Fetch-Dest': 'document',
//    'Sec-Fetch-Mode': 'navigate',
//    'Sec-Fetch-Site': 'none',
//    'Sec-Fetch-User': '?1',
//    'Upgrade-Insecure-Requests': '1',
//    'User-Agent': 'Mozilla/5.0 (compatible; Travellings Bot/1.30; +https://www.travellings.cn/docs/qa)',
//  },
//};

async function crawlAndCheck() {
  const connection = await mysql.createConnection(dbConfig);

  try {
    // 时间
    const currentTimeForFileName = moment().format('YYYY-MM-DD HH_mm_ss');

    // 写 log
    const logFileName = `${currentTimeForFileName}.log`;
    const logFilePath = path.join(BotlogsFolderPath, logFileName);
    const Botlogstream = fs.createWriteStream(logFilePath, { flags: 'a' });

    // ASCII 艺术字
    await new Promise((resolve) => {
      figlet('Travellings Bot', function (err, data) {
        if (err) {
          console.log('Something went wrong...');
          console.dir(err);
          return;
        }
        console.log(data);
        console.log(`\nTravellings Bot <Headless Browser / v 1.12> // Cpoyright (C) 2020-2023 Travellings-link Project. \n`);
        resolve();
      });
    });

    const logEntry = `>> 开始检测 \n`
    console.log(logEntry);
    Botlogstream.write(`${logEntry}\n`);

    // 查表
    const [rows] = await connection.query('SELECT * FROM webs');
    let runCount = 0;
    let lostCount = 0;
    let errorCount = 0;
    let timeoutCount = 0;

    const startTime = moment(); // 记录开始时间

    // Headless Browser
    const options = new chrome.Options();
    options.addArguments('--headless'); // headless
    options.addArguments('--disable-gpu'); // 禁用GPU加速
    options.addArguments('--disable-extensions'); // 禁用扩展
    options.addArguments('--disable-dev-shm-usage'); // 禁用/dev/shm
    options.addArguments('--disable-features=StylesWithCss=false'); // 禁用CSS加载
    options.addArguments('--blink-settings=imagesEnabled=false'); // 禁用图片加载
    options.addArguments(`--user-data-dir=${path.resolve(tempDir)}`);

    const driver = new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

      for (const row of rows) {
        let statusReason = ''; // 存储判定原因
        let driver;
      
        try {
          driver = new Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .build();
      
          await driver.get(row.link);
      
          // 加载页面
          const pageSource = await driver.getPageSource();
          if (pageSource.includes('travellings')) {
            // 有
            await connection.query('UPDATE webs SET status = ? WHERE indexs = ?', ['RUN', row.indexs]);
            statusReason = 'RUN';
            runCount++;
          } else {
            // 没有
            await connection.query('UPDATE webs SET status = ? WHERE indexs = ?', ['LOST', row.indexs]);
            statusReason = 'LOST';
            lostCount++;
          }
        } catch (error) {
          // 不正常情况
          if (error.message.startsWith('4') || error.message.startsWith('5')) {
            // 4xx 或 5xx 状态码
            await connection.query('UPDATE webs SET status = ? WHERE indexs = ?', [error.message, row.indexs]);
            statusReason = error.message;
          } else {
            await connection.query('UPDATE webs SET status = ? WHERE indexs = ?', ['ERROR', row.indexs]);
            statusReason = 'ERROR';
            errorCount++;
          }
        } finally {
          // 关闭浏览器
          if (driver) {
            await driver.quit();
          }
        }
    

      // 开机时间，用于日志命名
      const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');

      // log
      const logEntry0 = `[${currentTime}] 站点 ${row.link} 检测完成 >> ${statusReason}`;
      console.log(logEntry0);
      Botlogstream.write(`${logEntry0}\n`);
    }

    // 计算耗时
    const endTime = moment();
    const duration = moment.duration(endTime.diff(startTime));
    const hours = duration.hours();
    const minutes = duration.minutes();
    const seconds = duration.seconds();

    // 输出统计信息
    const logEntry1 = `\n>> 共 ${rows.length} 项 | RUN: ${runCount} | LOST: ${lostCount} | ERROR: ${errorCount} | TIMEOUT: ${timeoutCount} \n>> 检测耗时：${hours} 小时 ${minutes} 分钟 ${seconds} 秒\n`
    console.log(logEntry1);
    Botlogstream.write(`${logEntry1}\n`);

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