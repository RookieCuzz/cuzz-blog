---
title: fiber5
date: 2025-08-15 16:32:57
tags:
---


# Go Fiber 框架中 Cookie 的使用及其应用场景

## 1. Cookie 的基本概念

- **请求头中的 Cookie**：客户端发送的 Cookie 位于请求头中。
- **响应头中的 Set-Cookie**：服务端返回的 Cookie 位于响应头中。
- **常见应用场景**：Cookie 最常见的应用场景是作为登录凭证和用户身份的表示。例如，调用收费接口时，服务端会分配一个随机字符串作为 token，客户端每次调用接口都需要传递该 token。

## 2. 服务端验证 Token 的流程

- **存储 Token 和调用次数**：服务端使用并发安全的 map 来存储 token 和调用次数，初始值为零次。
- **中间件记录调用次数**：中间件会记录每个 token 的累计调用次数。中间件和 handler 一样，接受一个 context 并返回一个 error。
- **从请求头中读取 Cookie**：从请求头中读取特定的 cookie，使用框架的 `context.Cookies` 方法获取 cookie 的值。
- **验证 Token**：
    - 如果 map 中不存在该 token，则返回 403 错误；
    - 如果 token 合法，则增加调用次数并返回。

## 3. 服务端设置 Cookie 的方法

- **设置 Cookie**：通过调用 `context.Cookie` 方法设置响应头中的 cookie。该方法传入一个 `fiber.Cookie` 结构体，包含 `name`、`value`、`max_age`、`path`、`domain` 等字段。
- **字段说明**：
    - `max_age`：表示 cookie 的存活时间，单位为秒。浏览器会将 cookie 存储在本地文件中，以便后续请求重复利用。
    - `domain` 和 `path`：用于控制 cookie 的存放路径和域名，确保 cookie 的安全性和跨域限制。

## 4. 客户端请求携带 Cookie 的方式

- **构建请求并添加 Cookie**：客户端通过构建 `http.Request` 对象并添加 cookie 来请求后端接口。可以使用 `request.AddCookie` 方法连续添加多个 cookie。
- **发送请求**：客户端发送请求时，会将 cookie 添加到请求头中，并将其传递给服务端。
- **解析响应头中的 Set-Cookie**：服务端在响应头中返回 `set-cookie` 字段，包含新设置的 cookie 信息。客户端收到响应后，会解析该字段并更新本地 cookie。

## 5. 中间件记录 Token 调用次数的示例

以下是一个简单的中间件示例，用于记录每个 token 的调用次数：

```go
package main

import (
	"github.com/gofiber/fiber/v2"
	"sync"
)

var tokenCalls = struct {
	sync.RWMutex
	m map[string]int
}{m: make(map[string]int)}

func tokenMiddleware(c *fiber.Ctx) error {
	token := c.Cookies("token")
	if token == "" {
		return c.Status(fiber.StatusUnauthorized).SendString("Token is required")
	}

	tokenCalls.Lock()
	defer tokenCalls.Unlock()

	tokenCalls.m[token]++
	return c.Next()
}

func main() {
	app := fiber.New()

	app.Use(tokenMiddleware)

	app.Get("/", func(c *fiber.Ctx) error {
		return c.SendString("Hello, World!")
	})

	app.Listen(":3000")
}
```
## 6.Cookie 的安全设置
- HttpOnly：设置为 true，表示该 cookie 只能通过 HTTP 协议访问，JavaScript 无法访问。

- Secure：设置为 true，表示该 cookie 只能通过 HTTPS 协议发送。**

- SameSite：控制跨站请求时是否发送该 cookie。可以设置为 Strict、Lax 或 None。

```go

cookie := &fiber.Cookie{
	Name:     "token",
	Value:    "your_token_value",
	Expires:  time.Now().Add(24 * time.Hour),
	HttpOnly: true,
	Secure:   true,
	SameSite: "Strict",
}
c.Cookie(cookie)


```