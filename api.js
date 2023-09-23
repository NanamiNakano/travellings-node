//  _____                    _ _ _                      _    ____ ___ 
// |_   _| __ __ ___   _____| | (_)_ __   __ _ ___     / \  |  _ \_ _|
//   | || '__/ _` \ \ / / _ \ | | | '_ \ / _` / __|   / _ \ | |_) | | 
//   | || | | (_| |\ V /  __/ | | | | | | (_| \__ \  / ___ \|  __/| | 
//   |_||_|  \__,_| \_/ \___|_|_|_|_| |_|\__, |___/ /_/   \_\_|  |___|
//                                       |___/   
//                     
// By @BLxcwg666 <huixcwg@gmail.com / TG @xcnya>
// Version 1.81 / 2023/9/17 10:51 Lastest
// "玩原神玩的"

const express = require('express');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

const app = express();
const port = 3000;

// Express Headers
app.use((req, res, next) => {
  res.setHeader('Server', 'Travellings API/1.81');
  res.setHeader('X-Powered-By', 'Travellings API');
  next();
});

// MySQL
dotenv.config();
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  port: process.env.DB_PORT,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

// ASCII艺术字
var figlet = require('figlet');

figlet('Travellings API', function (err, data) {
    if (err) {
        console.log('Something went wrong...');
        console.dir(err);
        return;
    }
    console.log(data)
    console.log("");
    console.log("Travellings API <v 1.81> // Cpoyright (C) 2020-2023 Travellings-link Project.");
    console.log("");
    // 开机
    app.listen(port, () => {
    console.log(`>> Travellings API 已在端口 ${port} 上运行`);
});
});


// 这是 Random
app.get('/random', async (req, res) => {
  try {
    // random 一个状态是 run 的
    const [rows] = await pool.query('SELECT * FROM webs WHERE status = "RUN" ORDER BY RAND() LIMIT 1');
    
    // 没有就是没有
    if (rows.length === 0) {
      res.status(404).json({ error: 'No Active Sites Found' });
    } else {
      const site = rows[0];
      const result = {
        id: site.indexs,
        name: site.name,
        url: site.link,
        tag: site.tag,
      };
      res.json(result);
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 这是 fetch，用于搜索
app.get('/fetch', async (req, res) => {
  const id = req.query.id;
  const status = req.query.status;
  const name = req.query.name;
  const link = req.query.link;
  const tag = req.query.tag;
  const normal = req.query.normal === 'true'; // 如果请求需要，则用 json 返回

  // 除了 normal 只能带一个参数
  const queryParams = [id, status, name, link, tag].filter(param => param !== undefined && param !== 'true');
  if (queryParams.length !== 1) {
    res.status(400).json({ error: 'Invalid Query' });
    return;
  }

  try {
    let query = 'SELECT * FROM webs WHERE ';

    if (id !== undefined) {
      query += `indexs = ${id}`;
    } else if (status !== undefined) {
      query += `status = '${status}'`;
    } else if (name !== undefined) {
      if (name.startsWith('"') && name.endsWith('"')) {
        // 双引号完全匹配
        const exactName = name.slice(1, -1);
        query += `name = '${exactName}'`;
      } else {
        query += `name LIKE '%${name}%'`;
      }
    } else if (link !== undefined) {
      if (link.startsWith('"') && link.endsWith('"')) {
        // 同上
        const exactLink = link.slice(1, -1);
        query += `link = '${exactLink}'`;
      } else {
        query += `link LIKE '%${link}%'`;
      }
    } else if (tag !== undefined) {
      if (tag.startsWith('"') && tag.endsWith('"')) {
        // 同上
        const exactTag = tag.slice(1, -1);
        query += `tag = '${exactTag}'`;
      } else {
        query += `tag LIKE '%${tag}%'`;
      }
    }

    const startTime = new Date();
    const [rows] = await pool.query(query);
    const endTime = new Date();
    const duration = (endTime - startTime) + 'ms';

    if (rows.length === 0) {
      if (normal) {
        res.status(404).json({ error: 'No Matching Sites Found' });
      } else {
        res.status(404).send('<h3>未找到匹配的站点</h3>');
      }
    } else {
      if (normal) {
        res.json(rows);
      } else {
        // 画表格
        let html = '<style>table {width: 100%;} hr {border: 1px solid #ccc; margin-top: 20px;} .info {text-align: center; margin-top: 10px;}</style>';
        html += '<table border="1"><tr><th>站点ID</th><th>站点状态</th><th>站点名称</th><th>站点链接</th><th>站点标签</th></tr>';
        rows.forEach(site => {
          html += `<tr><td>${site.indexs}</td><td>${site.status}</td><td>${site.name}</td><td>${site.link}</td><td>${site.tag}</td></tr>`;
        });
        html += '</table>';
        html += '<hr>';
        html += `<div class="info">共 ${rows.length} 项，查询耗时: ${duration}</div>`;
        res.send(html);
      }
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 这是 All，用于查询所有站点
app.get('/all', async (req, res) => {
  const normal = req.query.normal === 'true'; // 如果请求需要，则使用 json 
  const normalTotal = req.query.normaltotal === 'true'; // 如果请求需要，则使用 json 输出统计

  try {
    const startTime = new Date(); // 开始计时

    const query = 'SELECT * FROM webs';
    const [rows] = await pool.query(query);

    if (rows.length === 0) {
      if (normal) {
        res.status(404).json({ error: 'No Sites Found' });
      } else {
        res.status(404).send('<h3>没有找到站点</h3>');
      }
    } else {
      if (normal) {
        res.json(rows);
      } else {
        // 画表
        let html = '<style>table {width: 100%;} hr {border: 1px solid #ccc; margin-top: 20px;} .info {text-align: center; margin-top: 10px;}</style>';
        html += '<table border="1"><tr><th>站点ID</th><th>站点状态</th><th>站点名称</th><th>站点链接</th><th>站点标签</th></tr>';
        rows.forEach(site => {
          html += `<tr><td>${site.indexs}</td><td>${site.status}</td><td>${site.name}</td><td>${site.link}</td><td>${site.tag}</td></tr>`;
        });
        html += '</table>';
        html += '<hr>';
        
        const endTime = new Date(); // 结束计时
        const queryTime = endTime - startTime;

        if (normalTotal) {
          // restful 统计
          const stats = {
            total: rows.length,
            run: rows.filter(site => site.status === 'RUN').length,
            lost: rows.filter(site => site.status === 'LOST').length,
            error: rows.filter(site => site.status === 'ERROR').length,
            timeout: rows.filter(site => site.status === 'TIMEOUT').length,
            query: queryTime + "ms",
          };

          res.json(stats);
        } else {
          // html
          html += `<div class="info">共 ${rows.length} 项，${rows.filter(site => site.status === 'RUN').length} 个 RUN，${rows.filter(site => site.status === 'LOST').length} 个 LOST，${rows.filter(site => site.status === 'ERROR').length} 个 ERROR，${rows.filter(site => site.status === 'TIMEOUT').length} 个 TIMEOUT，耗时 ${queryTime} ms</div>`;
          res.send(html);
        }
      }
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// 验证 token
async function verifyToken(requestToken) {
  try {
    // 在数据库中查询用户提供的 token
    const [rows] = await pool.query('SELECT COUNT(*) as count FROM sessions WHERE token = ?', [requestToken]);
    return rows[0].count > 0;
  } catch (error) {
    console.error('Error:', error);
    return false;
  }
}

// 这是 Add，用于添加站点
app.get('/add', async (req, res) => {
  const requestToken = req.query.token; // 从请求中获取 token

  // 鉴权
  const isValidToken = await verifyToken(requestToken);

  if (!isValidToken) {
    if (requestToken) {
      res.status(403).json({ error: 'Token 无效或已过期，请尝试重新登录' });
    } else {
      res.status(403).json({ error: 'Unauthorized' });
    }
    return;
  }

  const name = req.query.name;
  const link = req.query.link;
  const tag = req.query.tag;

  try {
    // 必须的三个参数 name link tag
    if (!name || !link || !tag) {
      res.status(400).json({ status: 'error', message: '参数缺失' });
      return;
    }

    // 去掉双引号
    const cleanedName = name.replace(/"/g, '');
    const cleanedLink = link.replace(/"/g, '');
    const cleanedTag = tag.replace(/"/g, '');

    // 丢进数据库，status 默认为 WAIT，等爬虫修改
    // id 用的是 MySQL 自增
    const insertQuery = `INSERT INTO webs (status, name, link, tag) VALUES ('WAIT', ?, ?, ?)`;
    const [result] = await pool.execute(insertQuery, [cleanedName, cleanedLink, cleanedTag]);

    if (result.affectedRows === 1) {
      // 顺便告诉你 id
      const insertedId = result.insertId;
      res.status(201).json({ status: 'ok', id: insertedId, message: '成功添加站点' });
    } else {
      res.status(500).json({ status: 'error', message: '添加站点失败' });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
});

// 这是 Edit，用于编辑站点
app.get('/edit', async (req, res) => {
  const requestToken = req.query.token; // 从请求中获取 token

  // 鉴权
  const isValidToken = await verifyToken(requestToken);

  if (!isValidToken) {
    if (requestToken) {
      res.status(403).json({ error: 'Token 无效或已过期，请尝试重新登录' });
    } else {
      res.status(403).json({ error: 'Unauthorized' });
    }
    return;
  }

  const id = req.query.id;
  let status = req.query.status;
  let name = req.query.name;
  let link = req.query.link;
  let tag = req.query.tag;

  // 去掉双引号
  if (status !== undefined) {
    status = status.replace(/"/g, '');
  }
  if (name !== undefined) {
    name = name.replace(/"/g, '');
  }
  if (link !== undefined) {
    link = link.replace(/"/g, '');
  }
  if (tag !== undefined) {
    tag = tag.replace(/"/g, '');
  }

  try {
    // 依赖 BUG 运行，别改，改了就炸
    if (!id || (!status && !name && !link && !tag)) {
      res.status(400).json({ status: 'error', message: '参数缺失' });
      return;
    }

    // 更新数据库
    let updateQuery = 'UPDATE webs SET ';
    const updateParams = [];
    if (status !== undefined) {
      updateQuery += 'status = ?, ';
      updateParams.push(status);
    }
    if (name !== undefined) {
      updateQuery += 'name = ?, ';
      updateParams.push(name);
    }
    if (link !== undefined) {
      updateQuery += 'link = ?, ';
      updateParams.push(link);
    }
    if (tag !== undefined) {
      updateQuery += 'tag = ?, ';
      updateParams.push(tag);
    }
    // 移除最后一个逗号和空格
    updateQuery = updateQuery.slice(0, -2);

    updateQuery += ` WHERE indexs = ?`;
    updateParams.push(id);

    const [result] = await pool.execute(updateQuery, updateParams);

    if (result.affectedRows === 1) {
      res.status(200).json({ status: 'ok', message: '成功更新站点信息' });
    } else {
      res.status(500).json({ status: 'error', message: '站点信息更新失败' });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
});

// 这是 Del，用于删除站点
app.get('/del', async (req, res) => {
  const requestToken = req.query.token; // 从请求中获取 token

  // 鉴权
  const isValidToken = await verifyToken(requestToken);

  if (!isValidToken) {
    if (requestToken) {
      res.status(403).json({ error: 'Token 无效或已过期，请尝试重新登录' });
    } else {
      res.status(403).json({ error: 'Unauthorized' });
    }
    return;
  }

  const id = req.query.id;

  try {
    // 必要参数 id
    if (!id) {
      res.status(400).json({ status: 'error', message: '参数缺失' });
      return;
    }

    // 删库
    const deleteQuery = 'DELETE FROM webs WHERE indexs = ?';
    const [result] = await pool.execute(deleteQuery, [id]);

    if (result.affectedRows === 1) {
      res.status(200).json({ status: 'ok', message: '成功删除站点' });
    } else {
      res.status(500).json({ status: 'error', message: '站点删除失败' });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
});



// 要加新东西在这加
