# 塔菲桌宠 —— Linux 容器测试
# 用法：
#   docker build -t taffy-test .
#   docker run --rm taffy-test
FROM node:22-bookworm-slim

RUN npm install -g @deepseek-ai/dsh

WORKDIR /repo
COPY . /repo

CMD ["node", "scripts/test-run.mjs"]
