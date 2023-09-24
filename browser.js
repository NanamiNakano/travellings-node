//  _____                    _ _ _                   ____        _   
// |_   _| __ __ ___   _____| | (_)_ __   __ _ ___  | __ )  ___ | |_ 
//   | || '__/ _` \ \ / / _ \ | | | '_ \ / _` / __| |  _ \ / _ \| __|
//   | || | | (_| |\ V /  __/ | | | | | | (_| \__ \ | |_) | (_) | |_ 
//   |_||_|  \__,_| \_/ \___|_|_|_|_| |_|\__, |___/ |____/ \___/ \__|
//                                       |___/                       
//
// By @BLxcwg666 <huixcwg@gmail.com / TG @xcnya>
// WTF the code is @KawaiiSh1zuku
// Headless Browser / Version 1.26 / 2023/9/24 19:27 Lastest
// "永远不要低估你的潜能，永远不要放弃你的梦想。"

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const moment = require('moment');
const dotenv = require('dotenv');
const {
    Builder
} = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const chalk = require('chalk');
const UA = "Mozilla/5.0 (compatible; Travellings Browser Bot/1.25; +https://www.travellings.cn/docs/qa)"
const tempDir = './tmp';
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
}
let driver;
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

async function crawlAndCheck() {
    const connection = await mysql.createConnection(dbConfig);

    try {
        // 时间
        const currentTimeForFileName = moment()
            .format('YYYY-MM-DD HH_mm_ss');

        // 写 log
        const logFileName = `${currentTimeForFileName}.log`;
        const logFilePath = path.join(BotlogsFolderPath, logFileName);
        const Botlogstream = fs.createWriteStream(logFilePath, {
            flags: 'a'
        });

        // ASCII 艺术字
        await new Promise((resolve) => {
            figlet('Travellings Bot', function(err, data) {
                if (err) {
                    console.log('Something went wrong...');
                    console.dir(err);
                    return;
                }
                console.log(data);
                console.log(`\nTravellings Bot <Headless Browser / v 1.25> // Cpoyright (C) 2020-2023 Travellings-link Project. \n`);
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
        options.page_load_strategy = 'eager' // DOM解析完后直接操作
        options.addArguments(`--user-data-dir=${path.resolve(tempDir)}`);
        options.addArguments(`--user-agent=${UA}`);
        options.excludeSwitches(['enable-logging']);
        options.addArguments('--log-level=OFF');

        driver = new Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .build();
        // 超时时间
        await driver.manage()
            .setTimeouts({
                implicit: process.env.BROWSER_TIMEOUT * 1000
            });
        for (const row of rows) {
            let statusReason = ''; // 存储判定原因

            try {
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
                // 超时
                if (error.name === 'TimeoutError') {
                    await connection.query('UPDATE webs SET status = ? WHERE indexs = ?', ['TIMEOUT', row.indexs]);
                    statusReason = 'TIMEOUT';
                    timeoutCount++;
                } else if (error.message.startsWith('4') || error.message.startsWith('5')) {
                    // 4xx or 5xx
                    await connection.query('UPDATE webs SET status = ? WHERE indexs = ?', [error.message, row.indexs]);
                    statusReason = error.message;
                } else {
                    await connection.query('UPDATE webs SET status = ? WHERE indexs = ?', ['ERROR', row.indexs]);
                    statusReason = 'ERROR';
                    errorCount++;
                }
            }

            // 开机时间，用于日志命名
            const currentTime = moment()
                .format('YYYY-MM-DD HH:mm:ss');

            // log
            const logEntry0 = `[${currentTime}] 站点 ${row.link} 检测完成 >> ${statusReason}`;
            console.log(chalk.blue(logEntry0));
            Botlogstream.write(`${logEntry0}\n`);
        }

        if (driver) {
            await driver.quit();
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