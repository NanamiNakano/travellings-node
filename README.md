# Travellings-Node
由 Node.JS 实现的基本 Travellings Services 功能，API、爬虫等

## 效率
git 提交的时候整没了，有时间再测  

## 环境需求
```
MySQL ≥ 8.0.12  
Node.JS ≥ 16  
Windows / Linux
```
## 数据库
`travellings.sql` 是从原 PgSQL 中本人 用 手 挨个 写进去的，本人并不反对 PgSQL，仅是我不会用  

## 本地部署
将仓库克隆到本地后，使用 `npm install` 安装基本依赖  
API 和 Bot 是两个东西，单独执行用 `node api.js` 和 `bot.js`  
数据库信息存放在 `.env` 文件中  
也可以用 systemctl 挂载为系统服务（仓库中已给出示例，请根据自己的文件目录进行改动）  

## 使用方法
### API
API 默认启动在 3000 端口，要改在 `.env` 里改  
API 有以下几个路径可以访问  
```
/random  随机一个数据库中 status 为 RUN 的站点
/all     查看数据库中所有的站点（使用 /all?normal=true 以 json 输出，使用 /all?normaltotal=true 以 json 输出统计信息）
/fetch   搜索站点（查询字符串中带有 &normal=true 以 json 输出）
         示例：http://127.0.0.1:3000/fetch?id=114  即搜索 indexs 为 114 的站点
              http://127.0.0.1:3000/fetch?name="BLxcwg666"  即搜索 name 为 BLxcwg666 的站点
         fetch 的查询字符串名即为数据表中的列（indexs status name link tag），加双引号为精确搜索（/fetch?tag="精确搜索"），不加双引号为模糊搜索（/fetch?tag=模糊搜索）
```
以下路径访问需要带有 &token=，对应 Token 存储在数据库中的 sessions 表中  
```
/add     添加一个站点（请求格式  /add?name="站点名称"&link="站点链接"&tag="tag"  三个参数缺一不可）
/del     删除一个站点（请求格式  /id=114  id 即数据库中的 indexs，仅用于定位站点，删除后该 id 后续不会自动填补）
/edit    添加一个站点（请求格式  /edit?id=114&status="RUN"&name="xxx の xxxx"&link="https://exmple.com"&tag="yuanzhen" 五个参数仅 id 不可缺少，请求中带哪个参数即修改哪个，不带的参数不会被修改）
```
fetch 得到的格式与 random 有所不同，您可以根据该 API 的请求格式开发相关的前端

### Bot
可选 `browser.js` or `bot.js`  
前者效率低但是精度准确，后者效率高但是精度不准确  
开机即可使用，默认 5 小时开启一次新的检测循环，默认超时时间为 30s，`browser.js` 在 `.env` 里改，`bot.js` 在代码里改

超时时间  
```
// Axios
const axiosConfig = {
  timeout: 30000, // 超时时间默认 30 秒，有需要自己改
```

循环间隔时间  
```
// 每隔 5 小时一次循环，有需要自己改
setInterval(crawlAndCheck, 5 * 60 * 60 * 1000);
```

## 展望未来
API 关键操作调用 Log  
独立管理系统 申请 + 审核，前后端分离  
~~Bot 支持 socks5 和 http 代理~~（不会）  
如果有了前端我会将 API 请求格式重写
修复 Browser ctrl c 后无法关闭所有浏览器  
bot.js 支持自定义超时时间

## 后记
开发者不是什么大公司的高级后端开发人员，代码烂就烂，能跑都不错了，有意见有建议提 PR 或者 Issues  
水平属实有限，重写原项目仅作为兴趣爱好，感谢你的理解
