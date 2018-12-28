FROM node:lts-alpine

RUN apk add yarn

EXPOSE 3060
WORKDIR /app
COPY ["package.json", "yarn.lock", "./"]
RUN yarn && \
	yarn upgrade @trulyacerbic/ttt-gamesdb@latest && \
    yarn cache clean

COPY . .

CMD ["yarn", "start"]
