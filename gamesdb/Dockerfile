FROM node:lts-alpine

RUN npm i -g prisma
COPY . /app
WORKDIR /app
RUN apk add bash

CMD ["./wait-for-it.sh", "prisma:4466", "-s", "-t", "0", "--", "prisma", "deploy"]