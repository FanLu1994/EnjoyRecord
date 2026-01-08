#!/bin/bash

# 部署脚本 - EnjoyRecord
# 功能: 自动打包并使用 PM2 部署应用到端口 80

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  EnjoyRecord 部署脚本${NC}"
echo -e "${GREEN}========================================${NC}"

# 检查 PM2 是否已安装
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}PM2 未安装，正在安装...${NC}"
    npm install -g pm2
fi

# 创建日志目录
echo -e "${YELLOW}创建日志目录...${NC}"
mkdir -p logs

# 停止并删除旧进程（如果存在）
echo -e "${YELLOW}停止旧进程...${NC}"
pm2 delete enjoyrecord 2>/dev/null || echo "无旧进程需要停止"

# 安装依赖
echo -e "${YELLOW}安装依赖...${NC}"
npm install

# 构建项目
echo -e "${YELLOW}构建项目...${NC}"
npm run build

# 使用 PM2 启动应用
echo -e "${YELLOW}启动应用...${NC}"
pm2 start ecosystem.config.js

# 保存 PM2 进程列表
echo -e "${YELLOW}保存 PM2 配置...${NC}"
pm2 save

# 设置 PM2 开机自启（可选）
echo -e "${YELLOW}是否设置开机自启?${NC}"
read -p "输入 y 设置开机自启，其他键跳过: " setup_startup
if [ "$setup_startup" = "y" ] || [ "$setup_startup" = "Y" ]; then
    pm2 startup
fi

# 显示运行状态
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
pm2 list

echo -e "${GREEN}应用已在端口 80 上运行${NC}"
echo -e "${YELLOW}常用命令:${NC}"
echo -e "  查看状态: pm2 status"
echo -e "  查看日志: pm2 logs enjoyrecord"
echo -e "  重启应用: pm2 restart enjoyrecord"
echo -e "  停止应用: pm2 stop enjoyrecord"
echo -e "  删除应用: pm2 delete enjoyrecord"
