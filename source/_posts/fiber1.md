---
title: fiber1
date: 2025-08-14 11:20:27
tags:
---
# Fiber服务器
```go
fiber.Config{
  ReadBufferSize       int                // 默认 4096：每个连接读取缓冲大小，也限制请求头最大长度
  WriteBufferSize      int                // 默认 4096：每个连接写缓冲大小
  ReadTimeout          time.Duration      // 默认 nil：读取请求（包括正文）的最大允许时间
  WriteTimeout         time.Duration      // 默认 nil：响应写入的超时时间
  IdleTimeout          time.Duration      // 默认使用 ReadTimeout：长连接空闲等待下一个请求的时间
  Prefork              bool               // 默认 false：启用 SO_REUSEPORT，实现多进程监听同一端口
  ServerHeader         string             // 默认 ""：自定义响应头里的 Server 字段
  TrustedProxies       []string           // 默认 []：信任代理列表
  ProxyHeader          string             // 默认 ""：用于 c.IP() 返回代理头中的 IP
  AppName              string             // 默认 ""：应用名称（仅用于日志或提示）
  JSONEncoder          utils.JSONMarshal  // 默认 json.Marshal：自定义 JSON 编码函数
  JSONDecoder          utils.JSONUnmarshal// 默认 json.Unmarshal：自定义 JSON 解码函数
  XMLEncoder           utils.XMLMarshal   // 默认 xml.Marshal：自定义 XML 编码函数
  Immutable            bool               // 默认 false：启用后 Ctx 返回值不可变
  StrictRouting        bool               // 默认 false：区分路径尾部斜杠，如 /foo 和 /foo/ 不等同
  CaseSensitive        bool               // 默认 false：区分大小写路由
  UnescapePath         bool               // 默认 false：解析 URL 编码后的字符再路由
  ETag                 bool               // 默认 false：启用 ETag 响应头（CRC-32 哈希）
  BodyLimit            int                // 默认 4 * 1024 * 1024：请求体最大字节限制
  StreamRequestBody    bool               // 默认 false：启用大 body 的流式处理
  Views                Views              // 默认 nil：用于模板渲染的视图引擎
  ViewsLayout          string             // 默认 ""：全局模板布局路径或名称
  PassLocalsToViews    bool               // 默认 false：将 c.Locals 传给模板引擎
  RequestMethods       []string           // 默认 DefaultMethods：自定义允许的 HTTP 方法
}
```
**Prefork:**

在 Fiber 中，Prefork: true 表示启用 SO_REUSEPORT 套接字选项 —— 这会启动多个 Go 进程监听同一个端口，从而提升并发性能。
Fiber
DEV Community

这是被称为 socket 分片（socket sharding） 的技术，它可以有效利用多核 CPU。在 Linux 内核中（3.9 及更高版本）引入了 SO_REUSEPORT，它允许多个套接字绑定到相同的 IP 和端口
连接分配机制：4-Tuple 哈希

Linux 内核使用一个 基于 4-Tuple（四元组）的哈希算法将每个新的连接分配给某个监听套接字。这个四元组包括：

源 IP（客户端 IP）

源端口（客户端端口）

目的 IP（服务器 IP）

目的端口（服务器端口）

虽然目标地址和目标端口对所有监听套接字都是相同的，但是源 IP 与源端口是变化的，它们提供了哈希所需的随机性和区分度。内核会将这四项输入到一个哈希函数，然后根据计算结果选择一个监听套接字来处理连接请求。
linuxjournal.rubdos.be
lwn.net

换句话说：

客户端每次发起连接时，源 IP 和端口不同，即使目的相同，也会导致哈希结果不同；

哈希结果决定了具体由哪个监听套接字来处理连接。

这样做的好处是：

负载均衡：连接请求会更平均地分布到不同进程或线程；

状态一致性：来自同一客户端的多次连接（保持四元组固定）会稳定地落到同一个子进程或线程上，便于状态维护。

# 中间件

```bash
app := fiber.New()

// 全局中间件
app.Use(func(c *fiber.Ctx) error {
    fmt.Println("Global middleware")
    return c.Next()
})

// 路径前缀中间件
app.Use("/api", func(c *fiber.Ctx) error {
    fmt.Println("API middleware")
    return c.Next()
})

// 路由处理函数
app.Get("/api/hello", func(c *fiber.Ctx) error {
    return c.SendString("Hello World")
})

```
**中间件执行顺序**
假设有中间件 m1, m2, m3, m4, m5, m6     
1.按注册顺序执行：m1 → m2 → m3 → ... → m6 → 处理函数   
2.next 函数控制执行： next() 调用链中下一个中间件。 可以返回错误，如果返回错误，后续中间件和处理函数将 不会执行。   


## ✅ 默认中间件（内置）

这些中间件是 Fiber 框架的一部分，通常无需额外安装即可使用：

- **Logger**：记录 HTTP 请求和响应的详细信息。
- **Recover**：捕获应用中的 panic 错误，防止服务器崩溃。
- **RequestID**：为每个请求生成唯一的 ID，方便追踪。
- **Pprof**：提供运行时性能分析数据，支持 `/debug/pprof/` 路径。
- **Timeout**：为请求设置超时限制，防止长时间阻塞。
- **FileSystem**：提供从指定目录服务静态文件的功能。
- **Favicon**：忽略 favicon 请求或从内存中提供图标，提升性能。
- **ExpVar**：通过 `/debug/vars` 路径暴露运行时变量。
- **Health Check**：实现应用的健康检查探针。
- **Compress**：支持 `gzip`、`deflate`、`brotli` 和 `zstd` 压缩。
- **Cache**：拦截并缓存 HTTP 响应。
- **ETag**：生成 ETag 头，优化缓存效率。
- **CSRF**：防止跨站请求伪造攻击。
- **CORS**：启用跨源资源共享。
- **EncryptCookie**：对 Cookie 值进行加密。
- **Idempotency**：确保重复请求不会导致重复操作。
- **Keyauth**：基于密钥的认证中间件。
- **Limiter**：限制请求频率，防止滥用。
- **Monitor**：报告服务器指标，灵感来源于 express-status-monitor。
- **Rewrite**：根据规则重写 URL 路径。
- **Redirect**：处理 URL 重定向。
- **Session**：会话管理中间件，支持多种存储方式。
- **Adaptor**：将 net/http 处理器转换为 Fiber 处理器。

## 🔌 外部中间件（需额外安装）

这些中间件由 Fiber 团队或社区维护，需单独安装：

- **BasicAuth**：HTTP 基本认证中间件。
- **Swagger**：集成 Swagger UI，生成 API 文档。
- **JWT**：JSON Web Token 认证中间件。
- **Casbin**：访问控制中间件，支持多种策略模型。
- **CircuitBreaker**：熔断器中间件，提升系统稳定性。
- **Fiberi18n**：国际化支持中间件。
- **FiberNewRelic**：集成 New Relic 监控。
- **FiberSentry**：集成 Sentry 错误追踪。
- **FiberZap**：集成 Zap 日志库。
- **OpenTelemetry**：分布式追踪支持。
- **PASETO**：PASETO 认证中间件。
- **WebSocket**：基于 FastHTTP 的 WebSocket 支持。

## 🧰 如何使用中间件

在 Fiber 中，可以通过 `app.Use()` 或路由组的 `Group.Use()` 方法应用中间件。例如：

```go
app.Use(logger.New()) // 全局应用日志中间件

api := app.Group("/api")
api.Use(authMiddleware) // 仅在 /api 路径下应用认证中间件
```