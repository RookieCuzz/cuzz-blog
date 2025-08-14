---
title: fiber学习笔记01
date: 2025-08-14 08:33:04
tags:
---
# Fiber



## Fiber框架快速入门


先注册Rest方法和路由URL以及对应的处理器,处理器需要满足func(*Ctx) error
func (app *App) Get(path string, handlers ...Handler) Router

```bash

func main(){
    #通过匿名函数传入handler
	app := fiber.New()
		app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})
	
}
```
使用APP.Listen方法启动服务器，指定监听端口号.监听成功则会阻塞主协程
```bash
	log.Printf("listening on %s", "127.0.0.1:8080")
	if err := app.Listen(addr); err != nil {
		log.Fatal(err)
	}
```

## Fiber框架请求处理

handler函数的入参context 封装了请求参数，包括请求行、请求头、请求体等信息。  
通过context.Request().Body获取请求体，是一个byte切片(不是流)，可以反复读取。  
通过context.Response().BodyWriter设置响应体，可以写入byte切片或字符串。  
可以设置响应头和状态码，设置顺序不限。  
使用context.SendStatus()设置状态码，建议用于仅设置状态码的场景。
## 📋 立即响应方法对比表

| 方法             | 描述                                                         | 示例代码                                                   |
|------------------|--------------------------------------------------------------|------------------------------------------------------------|
| `SendStatus()`   | 设置 HTTP 状态码并立即发送响应，响应体为空时会自动填充状态消息。 | `return c.SendStatus(fiber.StatusNotFound)`                |
| `SendString()`   | 设置响应体为字符串并发送。                                    | `return c.SendString("Hello, World!")`                     |
| `Send()`         | 设置响应体为字节切片并发送。                                  | `return c.Send([]byte("Hello, World!"))`                   |
| `SendStream()`   | 设置响应体为流并发送。                                        | `return c.SendStream(bytes.NewReader([]byte("Hello, World!")))` |


## 📋 延时响应方法对比表

| 方法                  | 描述                                                         | 示例代码                                                   |
|-----------------------|--------------------------------------------------------------|------------------------------------------------------------|
| `Status()`            | 设置响应的状态码，通常与其他方法链式调用。                   | `return c.Status(fiber.StatusOK).SendString("Success")`    |
| `Set()`               | 设置响应头部信息。                                           | `c.Set("X-Custom-Header", "Value")`                        |
| `Append()`            | 向响应头部添加值。                                           | `c.Append("Set-Cookie", "session=abc123")`                 |
| `Attachment()`        | 设置响应的 Content-Disposition 为附件。                     | `c.Attachment("file.txt")`                                 |
| `JSON()`              | 设置响应体为 JSON 格式并发送。                               | `return c.JSON(fiber.Map{"status": "ok"})`                 |
| `SendFile()`          | 发送文件作为响应体。                                         | `return c.SendFile("/path/to/file.txt")`                   |
| `SendStreamWriter()`  | 设置响应体为流写入器并发送。                                 | `return c.SendStreamWriter(func(w *bufio.Writer) { fmt.Fprintf(w, "Hello, World!") })` |


### 建议使用场景

- **仅返回状态码，无正文**：使用 SendStatus()。   
- **返回简单文本响应**：使用 SendString()。
- **返回二进制数据或自定义格式响应**：使用 Send()。
- **大文件传输或实时数据流**：使用 SendStream()。
- **设置响应状态码并发送响应**：使用 `Status()`。
- **设置响应头部信息**：使用 `Set()`。
- **向响应头部添加值**：使用 `Append()`。
- **设置响应为附件**：使用 `Attachment()`。
- **返回 JSON 格式响应**：使用 `JSON()`。
- **发送文件作为响应体**：使用 `SendFile()`。
- **大文件传输或实时数据流**：使用 `SendStreamWriter()`。:contentReference[oaicite:62]{index=62}

## Fiber框架中间件安装

Fiber框架不自带中间件，需要显式安装。   
安装日志和恢复中间件，使用use方法。   
日志中间件指定输出格式、时区和输出位置。   
恢复中间件用于捕获运行时异常，防止程序崩溃。  

```bash

	logFile, _ := os.OpenFile("./fiber.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, os.ModePerm)

	app.Use(logger.New(logger.Config{
		TimeFormat:    "2006-01-02 15:04:05",
		TimeZone:      "America/Sao_Paulo",
		DisableColors: true,
		Output:        logFile,
	}))

	app.Use(recover.New())
```


Fiber 的中间件和处理函数的执行顺序如下(Like Java-Netty ChannelPipeLine)：

请求首先经过所有注册的中间件。
- 每个中间件可以选择是否调用 next()，将控制权传递给下一个中间件或路由处理函数。   
- 如果所有中间件都调用了 next()，请求将到达路由处理函数，生成响应。   
- 响应返回时，所有中间件将按相反的顺序执行，进行后处理。   
- 这种机制使得可以在请求处理过程中插入日志记录、错误恢复、身份验证等功能，实现高度的灵活性和可维护性。   

**自定义中间件**
```bash
func customMiddleware(c *fiber.Ctx) error {

	fmt.Println("customMiddleware 前处理")
	// 在请求处理之前执行的逻辑 // ... //
	err := c.Next()
	if err != nil {
		return nil
	}
	// 在响应写入后执行的逻辑
	// 获取响应体的写入器
	bodyWriter := c.Response().BodyWriter()
	_, err = bodyWriter.Write([]byte("中间件后处理追加内容"))
	fmt.Println("customMiddleware 后处理")
	if err != nil {
		return nil
	}

	return nil

}
```