# 微信扫码登录（基于 OAuth2.0 网页授权）流程复盘

## 时序图（ASCII）

```
User            Browser         OurSite (loginU)       WeChat OAuth       OurSite Callback       Backend
 |                 |                  |                      |                    |                     |
 | 扫码打开页面    |                  |                      |                    |                     |
 |---------------->|                  |                      |                    |                     |
 |                 | 请求登录页       |                      |                    |                     |
 |                 |----------------->|                      |                    |                     |
 |                 |                  | 返回登录页（有 sid）   |                    |                     |
 |                 |                  |<---------------------|                    |                     |
 | 点击授权按钮    |                  | 构造授权 URL          |                    |                     |
 |---------------->|                  |--------------------->|                    |                     |
 |                 | 重定向到微信 OAuth |                      | 授权确认界面        |                     |
 |                 |------------------------->|               |                    |                     |
 |                 |                  |                      | 用户同意授权        |                     |
 |                 |                  |                      |-------------------->|                     |
 |                 |                  |                      | 302 重定向到回调     |                     |
 |                 |<------------------------------------------|                    |                     |
 |                 |                  |                      |                    |                     |
 |                 | 请求回调         |                      |                    |                     |
 |----------------------------------->|                      |                    |                     |
 |                 |                  | 处理 callback 拿 code   |                    |                     |
 |                 |                  | code -> 换取 token     |                    |                     |
 |                 |                  | openid + access_token|                    |                     |
 |                 |                  |---------------------->|                    |                     |
 |                 |                  | 调用微信 API 拉用户信息|                    |                     |
 |                 |                  |<----------------------|                    |                     |
 |                 |                  | 绑定/登录            |                    |                     |
 |                 |                  |---------------------->|                    |                     |
 |                 |                  | 登录成功             |                    |                     |
```

## 一、扫码登录整体流程

### 1. 请求登录二维码

- 前端请求后端生成登录二维码
- 后端生成唯一 `sid`（如 `or_<随机 hex>`）标记会话
- 返回二维码 URL：
  ```
  https://你的域名/wechat/loginU?sid=...
  ```

### 2. 用户扫码打开登录页

- 用微信客户端扫描二维码
- 在微信内置浏览器打开页面

### 3. 点击授权按钮（开始 OAuth2 授权）

- 构造微信 OAuth 授权链接：
  ```
  https://open.weixin.qq.com/connect/oauth2/authorize
    ?appid=<公众号AppID>
    &redirect_uri=<回调地址>
    &response_type=code
    &scope=snsapi_userinfo
    &state=<sid>
    #wechat_redirect
  ```

**参数说明：**
- `redirect_uri`：微信授权成功后回跳的固定接口
- `state`：带上 sid 用于会话关联（微信会原样带回）

### 4. 微信授权 & 用户确认

- 微信展示授权确认页面
- 用户同意后微信发出 HTTP **302 重定向** 跳回你的回调 URL
- 在 URL 上附加参数：
  ```
  ?code=<授权码>&state=<sid>
  ```
- 这是 OAuth2 授权码模式返回 code 的标准机制

### 5. 后端回调处理

- 回调接口收到请求：
  ```
  GET /wechat/callback?code=...&state=...
  ```

- 后端用 `code` 调用微信 API 换取网页授权令牌：
  ```
  GET https://api.weixin.qq.com/sns/oauth2/access_token
    ?appid=APPID
    &secret=APP_SECRET
    &code=CODE
    &grant_type=authorization_code
  ```

- 返回结果：
  ```json
  {
    "access_token": "ACCESS_TOKEN",
    "expires_in": 7200,
    "refresh_token": "REFRESH_TOKEN",
    "openid": "OPENID",
    "scope": "..."
  }
  ```

**关键字段说明：**
- `openid`：用户在该公众号/开放平台应用下的唯一标识
- `access_token`：用于后续拉取用户信息（例如 `sns/userinfo`）
- 注意：该 access_token 是网页授权专用，不同于公众号全局 access_token

### 6. 绑定 / 登录

- 后端根据 openid 是否已绑定本地玩家账号：
  - **未绑定** → 引导玩家输入帐号密码进行绑定
  - **已绑定** → 直接登录
- 生成登录态后消耗 sid，清理临时会话

## 二、关键概念

### openid 是什么？

- openid 是用户在当前微信应用下的唯一识别标识
- 用于区分不同用户、做账号绑定/关联

### access_token 有什么用？

- 是 **OAuth2 授权凭证**，用于调用微信接口获取用户基本信息（昵称、头像等）
- 不是登录凭证；登录凭证由你自己系统生成（Session/Cookie/Token）
- 注意：该 access_token 是网页授权专用，不同于公众号全局 access_token

## 三、为什么走 code → access_token 流程

- 遵循 OAuth2 授权码模式（Authorization Code Grant）
- 用户确认后由微信返回一次性授权码（code）
- 服务器用 code 去后台换取令牌（更加安全）
- 并用令牌调用用户信息接口

## 四、回调如何用 sid 做会话关联

- 发起授权时把 sid 放入 `state` 参数
- 微信授权完毕回调时原样带回
- 后端用回传的 state 去查临时扫码会话表
- 将授权结果和原始扫码行为关联

## 五、简短总结

**完整流程：**
```
用户扫码 → 授权页 → 微信回调带 code + state → 
后端用 code 换取 access_token + openid → 
获取或创建用户 → 登录/绑定流程完成
```

**核心要点：**
1. 使用 OAuth2.0 授权码模式保证安全性
2. 通过 state 参数传递 sid 实现会话关联
3. openid 作为用户在微信生态的唯一标识
4. access_token 仅作为获取用户信息的临时凭证
5. 系统自身需要生成独立的登录态管理用户会话
