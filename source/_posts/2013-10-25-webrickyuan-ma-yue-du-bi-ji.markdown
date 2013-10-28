---
layout: post
title: "webrick源码阅读笔记"
date: 2013-10-25 16:21
comments: true
categories: 
---
webrick是ruby标准库中的一个webserver。
一些基础
============
### SizedQueue
一个线程安全的队列，有大小限制。队列为空的时候，pop操作的线程会被阻塞。队列满的时候，push操作的线程会被阻塞。

```ruby
q = SizedQueue.new 1

q.push 1

Thread.start {
    loop do
        puts q.pop
        sleep 10
    end
}


q.push 2
q.push 3
```

### TCPServer
TCP/IP stream型连接的服务器端套接字的类。accept实例方法会受理客户端的连接请求, 返回已连接的TCPSocket的实例。
### IO::select
多路复用IO。参数列表前三项为输入／输出／异常的IO（或者子类）的实例数组。第四个参数是timeout。第四个参数是timeout可以是整数、Float或nil(省略时的默认值)。指定为nil时，将会一直等到IO变成就绪状态。timeout时将返回nil，除此以外将返回一个包含3个元素的数组，这3个元素分别是等待输入／输出／异常的对象的数组(指定数组的子集)。

从rack开始
=========
rack可以简单的理解成ruby frameword 和 webserver 之间的一个通用接口。一份基于rack开发的web服务可以使用rack支持的各种server来运行。rack中的所有server都具有一个叫做run的方法，这个是web server的入口。那么从rack/lib/rack/handler/webrick.rb中可以找到如下代码。

```ruby
def self.run(app, options={})
    environment  = ENV['RACK_ENV'] || 'development'
    default_host = environment == 'development' ? 'localhost' : '0.0.0.0'

    options[:BindAddress] = options.delete(:Host) || default_host
    options[:Port] ||= 8080
    options[:OutputBufferSize] = 5
    @server = ::WEBrick::HTTPServer.new(options)
    @server.mount "/", Rack::Handler::WEBrick, app
    yield @server  if block_given?
    @server.start
end
```
那么就从WEBrick::HTTPServer开始，看看mount和start方法是怎么工作的。

进入webrick
==========
```ruby
class HTTPServer < ::WEBrick::GenericServer
    ...
end
```

这里有必要说说GenericServer。
其中有两个只读的实例变量：listeners, tokens。
listeners是监听连接的socket数组。
tokens是最大连接数量（并发数量）。

### start方法

```ruby
def start(&block)
	...
      while @status == :Running
		...
          if svrs = IO.select(@listeners, nil, nil, 2.0)
            @logger.debug(svrs.to_s)
            svrs[0].each{|svr|
              @tokens.pop          # blocks while no token is there.
              if sock = accept_client(svr)
                sock.do_not_reverse_lookup = config[:DoNotReverseLookup]
                th = start_thread(sock, &block)
                th[:WEBrickThread] = true
                thgroup.add(th)
              else
                @tokens.push(nil)
              end
            }
          end
		...
      end
    ...
  }
end
```
start中，是一个循环。当没有请求的时候，主线程会被select阻塞。有请求的时候，针对每个输入就绪的socket，会通过调用socket的accept方法，来产生一个与客户端通信的新socket，而原来的socket依然在端口上监听。

针对每个与客户端通信的socket，webrick会创建一个线程（相关代码在start_thread中，稍后提及）来处理请求，这里@tokens的作用类似信号量，初始化server的时候，会把@tokens用nil填充满，只有能从@token获取到信号的时候，才可以创建线程，获取不到信号的时候，会阻塞主线程，以此控制并发数量。这里参见之前提到的SizedQueue。

每个请求的具体行为，就要继续查看start_thread了。

### start_thread

这个方法中是一些异常和logger的处理，主要的一句是
```ruby
def start_thread(sock, &block)
	...
	block ? block.call(sock) : run(sock)
	...
end
```
显而易见，run(sock)就是下个目标。

### run
这个方法，就要回到::WEBrick::HTTPServer了。

```ruby
def run(sock)
      while true
        res = HTTPResponse.new(@config)
        req = HTTPRequest.new(@config)
        server = self
        begin
          timeout = @config[:RequestTimeout]
          while timeout > 0
            break if IO.select([sock], nil, nil, 0.5)
            timeout = 0 if @status != :Running
            timeout -= 0.5
          end
          raise HTTPStatus::EOFError if timeout <= 0
          raise HTTPStatus::EOFError if sock.eof?
          req.parse(sock)
          res.request_method = req.request_method
          res.request_uri = req.request_uri
          res.request_http_version = req.http_version
          res.keep_alive = req.keep_alive?
          server = lookup_server(req) || self
          if callback = server[:RequestCallback]
            callback.call(req, res)
          elsif callback = server[:RequestHandler]
            msg = ":RequestHandler is deprecated, please use :RequestCallback"
            @logger.warn(msg)
            callback.call(req, res)
          end
          server.service(req, res)
        rescue HTTPStatus::EOFError, HTTPStatus::RequestTimeout => ex
          res.set_error(ex)
        rescue HTTPStatus::Error => ex
          @logger.error(ex.message)
          res.set_error(ex)
        rescue HTTPStatus::Status => ex
          res.status = ex.code
        rescue StandardError => ex
          @logger.error(ex)
          res.set_error(ex, true)
        ensure
          if req.request_line
            if req.keep_alive? && res.keep_alive?
              req.fixup()
            end
            res.send_response(sock)
            server.access_log(@config, req, res)
          end
        end
        break if @http_version < "1.1"
        break unless req.keep_alive?
        break unless res.keep_alive?
      end
    end
```
### req.parse

从socket读取请求报文，构造request实例。
```ruby
def parse(socket=nil)
  @socket = socket
  begin
    @peeraddr = socket.respond_to?(:peeraddr) ? socket.peeraddr : []
    @addr = socket.respond_to?(:addr) ? socket.addr : []
  rescue Errno::ENOTCONN
    raise HTTPStatus::EOFError
  end

  read_request_line(socket)
  if @http_version.major > 0
    read_header(socket)
    @header['cookie'].each{|cookie|
      @cookies += Cookie::parse(cookie)
    }
    @accept = HTTPUtils.parse_qvalues(self['accept'])
    @accept_charset = HTTPUtils.parse_qvalues(self['accept-charset'])
    @accept_encoding = HTTPUtils.parse_qvalues(self['accept-encoding'])
    @accept_language = HTTPUtils.parse_qvalues(self['accept-language'])
  end
  return if @request_method == "CONNECT"
  return if @unparsed_uri == "*"

  begin
    setup_forwarded_info
    @request_uri = parse_uri(@unparsed_uri)
    @path = HTTPUtils::unescape(@request_uri.path)
    @path = HTTPUtils::normalize_path(@path)
    @host = @request_uri.host
    @port = @request_uri.port
    @query_string = @request_uri.query
    @script_name = ""
    @path_info = @path.dup
  rescue
    raise HTTPStatus::BadRequest, "bad URI `#{@unparsed_uri}'."
  end

  if /close/io =~ self["connection"]
    @keep_alive = false
  elsif /keep-alive/io =~ self["connection"]
    @keep_alive = true
  elsif @http_version < "1.1"
    @keep_alive = false
  else
    @keep_alive = true
  end
end
```
先是解析请求行，再是请求报文头部解析，最后确定keep_alive

回到run。

一般的使用情况下server都是self，lookup_server与virtual_hosts有关。server.service就是self.service，其中，找到了真正的servlet的实例，并调用实例的service方法。其中可以看看mount方法的作用：可以把不同的servlet mount不同的url上，形成一个路由表。

rack的webrick handler就是一个webrick servlet，并且复写了service这个方法。server.service(req, res)调用完毕，那么response的各个属性也就填好了，接着```res.send_response(sock)```会通过socket来发送数据。