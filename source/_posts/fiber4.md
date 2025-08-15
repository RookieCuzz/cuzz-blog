---
title: fiber4
date: 2025-08-15 14:42:59
tags:
---
---
title: fiber2
date: 2025-08-15 14:02:23
tags:
---

# Go Fiber 响应类型、模板渲染、静态资源与重定向笔记

以下内容基于 Fiber 框架 v2.x 功能总结，并结合官方文档进行补充。Fiber 是一个受到 Express 启发、性能高效的 Go Web 框架 :contentReference[oaicite:0]{index=0}。

---

## 1. 返回普通字符串（Text）

- 使用 `c.SendString(...)` 或 `c.Send(...)` 返回纯文本响应。
- 默认为 `Content-Type: text/plain; charset=utf-8`。
- `SendString` 是 `Send([]byte)` 的快捷方式，性能更优 :contentReference[oaicite:1]{index=1}。

```go
app.Get("/plaintext", func(c *fiber.Ctx) error {
    return c.SendString("Hello Fiber")
})
```

# Fiber 路由分组


在 Go 的 Fiber 框架中，路由分组（Route Grouping）是一种组织和管理路由的有效方式，
特别适用于大型应用程序。通过将相关的路由组合在一起，可以提高代码的可读性和可维护性。
Fiber 的路由分组功能类似于 Express.js，使得路由的管理更加清晰

每个分组不仅可以继承父分组的路径前缀，还可以添加自己的中间件。这使得在不同的路由组中应用特定的逻辑变得更加灵活。

```go

package main

import "github.com/gofiber/fiber/v2"

func main() {
	app := fiber.New()

	// 创建 "/api" 分组，添加中间件
	api := app.Group("/api", func(c *fiber.Ctx) error {
		// 中间件逻辑
		return c.Next()
	})

	// 创建 "/api/v1" 子分组，添加中间件
	v1 := api.Group("/v1", func(c *fiber.Ctx) error {
		// v1 特定的中间件逻辑
		return c.Next()
	})
	v1.Get("/users", func(c *fiber.Ctx) error {
		return c.SendString("List of users in v1")
	})

	// 创建 "/api/v2" 子分组，添加中间件
	v2 := api.Group("/v2", func(c *fiber.Ctx) error {
		// v2 特定的中间件逻辑
		return c.Next()
	})
	v2.Get("/users", func(c *fiber.Ctx) error {
		return c.SendString("List of users in v2")
	})

	app.Listen(":3000")
}


```

## 将路由分组提取到单独的文件

为了保持 main.go 的简洁性，可以将路由分组的定义
提取到单独的文件中。这有助于代码的模块化和可维护性。

```go
// routes/v1.go
package routes

import "github.com/gofiber/fiber/v2"

func SetupV1Routes(api fiber.Router) {
	v1 := api.Group("/v1")
	v1.Get("/users", func(c *fiber.Ctx) error {
		return c.SendString("List of users in v1")
	})
}



```

然后在 main.go 中调用：
```go

package main

import (
	"github.com/gofiber/fiber/v2"
	"<your-module>/routes"
)

func main() {
	app := fiber.New()

	api := app.Group("/api")
	routes.SetupV1Routes(api)

	app.Listen(":3000")
}


```
**注意事项**

- 路由顺序：在定义路由时，确保将具体的路由放在通配符路由之前，以避免被通配符匹配到。

- 中间件的使用：中间件可以在分组级别定义，从而仅应用于特定的路由组。

- 模块化结构：将路由分组的定义提取到单独的文件中，有助于保持项目结构的清晰和可维护性。


