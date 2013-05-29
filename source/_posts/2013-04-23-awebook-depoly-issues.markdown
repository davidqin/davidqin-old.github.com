---
layout: post
title: "awebook部署中遇到的问题"
date: 2013-04-23 11:58
comments: true
categories: 
---
记录部署过程中遇到的一些比较耗时的问题。

目录
---

> [capistrano deploy名字空间中使用upload函数问题](#deploy-upload)
> 
> [capistrano 本地用户名字与服务器不同](#diff-user-name)
> 
> [solr索引没有放到shared中，更新代码导致索引丢失](#share-solr-index)
> 
> [solr关闭时残留进程](#solr-process)
> 
> [多用户的rvm](#rvm-multi-user)
>
> [passenger安装在global gemset，而app在其他gemset, app运行时gem加载不正确](#load-gem-error)
>
> [脚本修改/etc/sudoers](#etc-sudoers)
>
> [脚本中以非交互方式修改服务器root密码](#edit-pass-in-script)
>
> [echo与>或者>>配合使用权限问题](#sudo-echo)
>
> [指定用户执行脚本，用户没有登陆权限](#no-shell-user-execute-script)

[capistrano deploy名字空间中使用upload函数问题](id:deploy-upload)
---
```ruby
# 问题
upload('bin/rvm_install.sh','~/rvm_install.sh')
wrong number of arguments (2 for 0) (ArgumentError)
```

经过search发现，upload在deploy名字空间下是一个task。


	12:55 <MojoLA> I think I've discovered what's going on ... 
	12:56 <MojoLA> when I call "upload" within the :deploy namespace, it's trying to call a task named deploy:upload 
	12:57 <MojoLA> now I just have to figure out a way around it 
	13:07 <MojoLA> yep, if you're inside the :deploy namespace "upload" is masked by a task of the same name 
	13:08 <MojoLA> so if I call out to a different namespace, I can do my uploads from there 

##### 解决的办法

```ruby
# 调用top下的upload
top.upload('bin/rvm_install.sh','~/rvm_install.sh')
```

[capistrano 本地用户名字与服务器不同](id:diff-user-name)
---

capistrano默认使用当前系统当前用户名称作为脚本中的user，来登陆远程服务器。而我的本地的user是davidqhr而远程的是david，二者不一致，会出问题。有一种解决方案是在我每次执行task的时候，我手动输入用户名来指定我需要用哪一个用户登陆远程服务器，但是我并不想这个做，感觉很麻烦。

##### 解决办法

写一个yml配置，根据配置是否存在，来决定是否修改登陆user。

##### Capfile

```ruby
if File.exist?(File.join(Dir.pwd, "..", "config.yml"))
  require 'yaml'
  user_config = YAML.load_file(File.join(Dir.pwd, "..", "config.yml"))
  set :user, user_config["server_user_name"]
end
```

##### yml

    server_user_name: david
 
[solr索引没有放到shared中，更新代码导致索引丢失](id:share-solr-index)
---

由于solr中的索引没有放到shared文件夹中，导致每次更新代码的时候，以前的搜索索引都会被清除。

##### 解决办法

```ruby
desc "start solr"
task :start, :roles => :app do
  run "cd #{current_path} && RAILS_ENV=production bundle exec sunspot-solr start --port=8983 --data-directory=#{shared_path}/solr/data --pid-dir=#{shared_path}/pids --log-file=#{shared_path}/solr/log --solr-home=#{current_path}/solr"
end

  # 其他task同理
  ...
  ...
```

[solr关闭时残留进程](id:solr-process)
---

在ubuntu下，通过```rake sunspot:solr:stop RAILS_ENV=production```关闭solr的时候，会有一个进程无法终止，反复开关solr几次后，会留下很多无用的进程。但是在MacOS中没有发现这个问题。

##### 解决办法

```ruby
desc "stop solr"
task :stop, :roles => :app do
  run "cd #{current_path} && RAILS_ENV=production bundle exec sunspot-solr stop ..."
  run "ps aux | grep solr | awk '{ print $2 }' | head -n 1 | xargs sudo kill -9"
end
```

[多用户的rvm](id:rvm-multi-user)
---

用户需要加入rvm用户组

```
NOTE: To Multi-User installers, please do NOT forget to add your users to the 'rvm'.
      The installer no longer auto-adds root or users to the rvm group. Admins must do this.
      Also, please note that group memberships are ONLY evaluated at login time.
      This means that users must log out then back in before group membership takes effect!
```

[passenger安装在global gemset，而app在其他gemset, app运行时gem加载不正确](id:load-gem-error)
---

rvm官网给出了解决办法，添加一个setup_load_paths.rb于config文件夹中，用来修改ENV['GEM_PATH']。

```ruby
if ENV['MY_RUBY_HOME'] && ENV['MY_RUBY_HOME'].include?('rvm')
  begin
    gems_path = ENV['MY_RUBY_HOME'].split(/@/)[0].sub(/rubies/,'gems')
    ENV['GEM_PATH'] = "#{gems_path}:#{gems_path}@global"
    require 'rvm'
    RVM.use_from_path! File.dirname(File.dirname(__FILE__))
  rescue LoadError
    raise "RVM gem is currently unavailable."
  end
end

# If you're not using Bundler at all, remove lines bellow
ENV['BUNDLE_GEMFILE'] = File.expand_path('../Gemfile', File.dirname(__FILE__))
require 'bundler/setup'
```

[脚本修改/etc/sudoers](id:etc-sudoers)
---
修改sudoers需要使用系统命令visudo。但是如果要使用脚本修改/etc/sudoers时遇到了一些问题。

/etc/sudoers 这个文件的权限为440。root的自己也没有权限修改。

```bash
$ ll /etc/sudoers 
-r--r-----  1 root  wheel  1283  4 15 13:26 /etc/sudoers
```
于是尝试着添加root对这个文件写权限。但是，修改了这个文件的权限之后，sudo命令就会失效。原因是当/etc/sudoers的权限不为440时，sudo会报错。并且只能切换到root用户改回来。如果无法使用root密码，那就悲剧了。

##### 解决办法

```bash
#!/bin/sh

# add blh group into /etc/sudoers
if [ -f "/tmp/sudoers.tmp" ]; then
  exit 1
fi

sudo cp /etc/sudoers /tmp/sudoers.tmp
sudo chmod 666 /tmp/sudoers.tmp
echo "%blh ALL=(ALL)NOPASSWD: ALL" >> /tmp/sudoers.tmp
sudo visudo -c -f /tmp/sudoers.tmp

if [ "$?" -eq "0" ]; then
  sudo cp /tmp/sudoers.tmp /etc/sudoers
fi

sudo rm /tmp/sudoers.tmp
```

[脚本中以非交互方式修改服务器root密码](id:edit-pass-in-script)
---

```ruby
def set_password(message)
  raise "need a block" unless block_given?

  password = Capistrano::CLI.password_prompt(message)
  confirmation = Capistrano::CLI.password_prompt("confirmation: ")
  if confirmation == password
    yield password
  else
    abort("password and confirmation doesn't match!")
  end
end

set_password "Set root password: " do |root_password|
  run "printf '#{root_password}\\n#{root_password}\\n' |sudo passwd root"
end
```
    
优点在于非交互，适合用在脚本中。缺点在于密码会被显示在标准输出。

[echo与>或者>>配合使用权限问题](id:sudo-echo)
---

经常会有将某些文本加入到某个文件中的需求，例如：

```bash
$ echo "rvm use 1.9.3@gemset" > ./.vimrc
$ echo "export some_string" >> ~/.bashrc
```

但是想要修改或创建的的文件权限不足的时候就会有问题，以下这种方式是**无效**的

```bash
$ sudo echo "rvm use 1.9.3@gemset" > ./.vimrc
$ sudo echo "export some_string" >> ~/.bashrc

#结果
-bash: xxx.xxx: Permission denied
```

无效的原因在于，sudo只作用于echo，而后面的**>**与**>>**仍是以当前用户权限执行。

##### 解决的办法

```bash

# 通过sh -c，使sudo提升的权限扩展到这个命令范围
$ sudo sh -c 'echo "some_sring" >> ~/.bashrc'

# 使用tee
$ echo "some_string" | sudo tee -a ~/.bashrc
```

[指定用户执行脚本，用户没有登陆权限](id:no-shell-user-execute-script)
---

需求背景：需要使用一个无shell权限的用户，来执行程序。
```bash
sudo su -s /bin/bash -l -c "rvm use 1.9.3-p0@backup && whenever --update-crontab" blh
```
