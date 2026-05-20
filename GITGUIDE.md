# 1. Git 准备工作

## 1.1 配置身份信息

```bash
git config --global user.name _NAME
git config --global user.email _EMAIL_ADDRESS
```

## 1.2 配置和github的通信

```bash
ssh-keygen -t rsa -C _EMAIL_ADDRESS
```

C:\Users\_USERNAME\.ssh\id_rsa存放私钥，
C:\Users\_USERNAME\.ssh\id_rsa.pub存放公钥，
在github.com/settings/ssh添加ssh keys，复制id_rsa.pub内容粘贴。

## 1.3 仓库相关

```bash
git clone https://github.com/Ethanth-star/aeri.git  # 下载到本地
git status  # 检查仓库状态
git switch -c _BRANCH_NAME  # 本地创建或切换分支如dev, feature
git branch  # 显示本地分支
git branch -a  # 显示所有分支
git add (_FILENAME) #  将文件添加到暂存区
git commit -m "_COMMIT_MESSAGE"  # 将修改提交到仓库，说明信息参照CONTRIBUTING.md
git merge --no-ff -m "_COMMIT_MESSAGE" _BRANCH_NAME  # 先执行切换分支，如git switch dev，再执行此命令将已经提交到仓库的修改合并到当前分支，如dev
```

工作区新建文件状态：Untracked
被修改文件状态：Modified
通过git add添加到暂存区状态：Staged
通过git commit提交到仓库状态：Committed

# 2. 工作流程

## 2.1 协作模型

```
仓库主人控制：
├── main（主干，通常锁定）
│   └── 只有主人/维护者能直接推送
│
├── dev（开发主分支）
│   └── 通常也受保护，需要 MR/PR 才能合并
│
└── 普通成员权限区：
    ├── feature/xxx（功能分支）
    ├── fix/xxx（修复分支）
    └── dev/你的名字（个人开发分支，可选）
```

## 2.2 示例

sb.要新增功能sth.

### 2.2.1 fork 项目到自己账号下

在项目网页上点击fork，取消勾选仅fork main

```bash
git remote add origin https://github.com/_NAME/aeri.git
git remote add upstream https://github.com/Ethanth-star/aeri.git
git remote -v
```

应当显示

```
origin  https://github.com/_NAME/aeri.git (fetch)
origin  https://github.com/_NAME/aeri.git (push)
upstream        https://github.com/Ethanth-star/aeri.git (fetch)
upstream        https://github.com/Ethanth-star/aeri.git (push)
```

### 2.2.2 基于原仓库的 dev 创建你的功能分支

```bash
git switch -c feature/_MODULE/_ILLUSTRATION upstream/dev
```

### 2.2.3 首次推送到你自己的 fork 仓库

```bash
git push origin feature/_MODULE/_ILLUSTRATION
```

### 2.2.4 在功能分支上开发功能 sth.

### 2.2.5 提交修改

```bash
git add .
git commit -m "_COMMIT_MESSAGE"
```

可以多次重复步骤3、4，每加一个小功能提交一次

### 2.2.6 推送到云端

```bash
git push origin feature/_MODULE/_ILLUSTRATION
```

推送成功后云端可见feature/_MODULE/_ILLUSTRATION分支

### 2.2.7 创建合并请求

在https://github.com/_NAME/aeri选择feature/_MODULE/_ILLUSTRATION分支，点击"New pull request"

```
base: dev <- compare: feature/_MODULE/_ILLUSTRATION
```

### 2.2.8 通知审核

PR内描述参照CONTRIBUTING.md

### 2.2.9 功能 sth.上线后，清理分支，以及同步上游更新

```bash
git checkout dev
git pull upstream dev  # 拉取上游最新，确保本地 dev 已包含你的 PR
git branch -d  feature/_MODULE/_ILLUSTRATION
```

```
# 如果提示 "not fully merged"（未被合并到 dev）：# - 确认 PR 是否已被合并？如果没有，去网页确认状态
# - 如果 PR 被拒绝或关闭，可以强制删除：git branch -D feature/_MODULE/_ILLUSTRATION
# - 如果 PR 已合并但提示这个错误，说明本地 dev 没拉取最新，执行 git pull upstream dev
```

```
# 删除远程功能分支
```

```bash
git push origin --delete feature/_MODULE/_ILLUSTRATION
```

```
# 如果upstream/dev有更新，在功能分支上
```

```bash
git fetch upstream
git rebase upstream/dev
git push origin feature/_MODULE/_ILLUSTRATION --force-with-lease
```