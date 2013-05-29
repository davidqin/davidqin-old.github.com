---
layout: post
title: "awebook 使用memcache做性能优化"
date: 2013-05-30 02:43
comments: true
categories: 
---
背景
---
页面上有5个下拉框，每个下拉框使用grouped_collection_select生成，有3000多个商品，所以每个下拉框中有3000多个options。由于需求，不能使用ajax分页加载这3000个商品。请求速度很慢很慢。

猜想1
---
过多的sql查询导致速度缓慢

### 减少批次

5个下拉框发出的sql应该是一样的，将这5次，减少为1次，查找相关的资料如下，说明这个优化是没有必要的。


<pre>查询缓存是 Rails 的一个特性，它缓存了每一个数据库查询的结果集，这样如果 Rails 再次遇到那个请求中的同样的查询，它将会使用缓存的结果集而不是到数据库中继续查询。

第二次对数据库运行相同的查询，它实际上并不到数据库查询。第一次查询返回的结果存储在查询缓存（内存）中，第二次就直接从内存中读取。

然而，需要注意查询缓存在一个 action 的开始时创建，在 action 结束时清除，只持续在这个 action 的期间。如果希望在一个更持久的方式中存储查询结果，可以在 Rails 中使用低级别的缓存。
</pre>


### 缓存整个公司的商品列表

经测验，action加载时间有增无减。由于业务逻辑原因，需要对商品进行分类显示，这样整个公司的商品列表缓存，需要在获取到所有缓存商品后，在内存中为商品分类，这个过程很耗时。得不偿失。

### 缓存公司每一个商品分类的商品列表

本地开发环境下测试结果如下，发现变化并不很明显，于是有了猜想2

之前

![Alt text](images/before_cache.png)

之后

![Alt text](images/after_cache.png)

猜想2
---
memcache的查询速度比sql快不了多少，过多次数的memcache read导致速度提升不多

### 减少下拉框的数量

逐渐从0-5修改下拉框的数量

action 的反映时间如下表

| select quantity | Action Response Time(S) |
| ----------------| -------------        
| 0               | 0.5                  
| 1               | 1.06                 
| 2               | 1.55                 
| 3               | 1.92                 
| 4               | 2.2                  
| 5               | 2.5                  

貌似说明了猜想，但是偶然间的一个测试，发现了问题

memcache查询次数不变，不执行grouped_collection_select函数，访问速度就会在0.5秒左右

发现问题
---
sql与memcache的read都不是问题，问题处在模版渲染上。

解决方案
---
缓存grouped_collection_select中生成的options的html文本。不使用grouped_collection_select，改为使用option_groups_from_collection_for_select与select的组合，这样就可以针对options的html进行缓存。

```ruby
options = Rails.cache.fetch("XXX", expires_in: 10.minutes) do
  option_groups_from_collection_for_select( available_categories, :products, :name, :number, :name)
end

self.select(:product_number, options.html_safe, :include_blank => true)
```

如果，这个select出现在edit页面中，需要填写已有的数据，在调用select之前做一个简单的字符串替换

```ruby
if self.object.product
  product = self.object.product
  value   = product.number
  text    = product.name
  options = options.sub("<option value=\"#{value}\">#{text}</option>", "<option value=\"#{value}\" selected=\"selected\">#{text}</option>")
end
```

需要在product，以及product_category的create，destroy，update action中清空缓存

```ruby
Rails.cache.delete("XXX")
```