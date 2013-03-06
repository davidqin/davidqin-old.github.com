--- 
categories: 
  - ruby
comments: true
layout: post
published: true
status: publish
tags: []
title: "ruby 先有鸡还是先有蛋问题"
type: post
---
困惑了很久，一篇文章终于让我豁然开朗，终于不憋了！！！

出处：http://www.blogjava.net/killme2008/archive/2007/09/29/149452.html

附图
<a href="http://qinhru-wordpress.stor.sinaapp.com/uploads/2012/08/ch_class_metaobj.png"><img src="http://qinhru-wordpress.stor.sinaapp.com/uploads/2012/08/ch_class_metaobj-300x163.png" alt="" title="ch_class_metaobj" width="300" height="163" class="alignnone size-medium wp-image-402"></a>

1、
ruby在底层做了处理，instance的class在ruby层次是(instance),当查找的时候忽略了singleton类以及下面将要谈到的include模块的代理类，沿着继承链上查找
其中FL_TEST(cl,FL_SINGLETON)用于测试是否是singleton类，而TYPE(cl)==TL_ICLASS是否是包含模块的代理类，TL_ICLASS的I就是include的意思。

``` c
VALUE
 rb_obj_class(obj)
 VALUE obj;
 {
 return rb_class_real(CLASS_OF(obj));
 }

 VALUE
 rb_class_real(cl)
 VALUE cl;
 {
 while (FL_TEST(cl, FL_SINGLETON) || TYPE(cl) == T_ICLASS) {
 cl = RCLASS(cl)->super;
 }
 return cl;
 }
 ```




2、
图中类OtherClass继承Object，这个是显而易见的，不再多说。而Object、Class和Module这三个类是没办法通过API创建的，称为元类，他们的之间的关系如图所示，Object的class是Class,Module继承Object,而Class又继承Module，因此Class.kind_of? Object返回true,这个问题类似先有鸡，还是先有蛋的问题，是先有Object？还是先有Class?而c ruby的解决办法是不管谁先有，创建Object开始，接着创建Module和Class，然后分别创建它们的metaclass，从此整个Ruby的对象模型开始运转。

{% codeblock %}

VALUE
 rb_obj_class(obj)
 VALUE obj;
 {
 return rb_class_real(CLASS_OF(obj));
 }

 VALUE
 rb_class_real(cl)
 VALUE cl;
 {
 while (FL_TEST(cl, FL_SINGLETON) || TYPE(cl) == T_ICLASS) {
 cl = RCLASS(cl)->super;
 }
 return cl;
 }

{% endcodeblock %}


那么当我们调用Class.class发生了什么？Class的klass其实指向的是(Class)，可根据上面的代码，我们知道会忽略这个(Class)，继续往上找就是(Module),同理找到(Object)，而(Object)继承自Class,显然Class的类仍然是Class，Class的类的类也是Class,多么有趣。同理，Object.class和Module.class都将是Class类。


3、
 再来看看include模块时发生的故事。include模块的过程如下图所示：
<a href="http://qinhru-wordpress.stor.sinaapp.com/uploads/2012/08/ch_class_include.png"><img src="http://qinhru-wordpress.stor.sinaapp.com/uploads/2012/08/ch_class_include.png" alt="" title="ch_class_include" class="alignnone size-full wp-image-403"></a>

include模块，本质上是在对象或者类的klass和super之间插入了一个代理类iclass,这个代理类的方法表(m_table)和变量表(iv_table)分别指向了被包含的模块的方法表和变量表（通过指针，因此当包含的Module变化的时候，对象或者类也能相应变化），那么在查找类或者对象的class的时候，上面已经说明将忽略这些代理类。
