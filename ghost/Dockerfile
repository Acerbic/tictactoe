FROM node:lts-alpine

RUN apk add yarn

EXPOSE 3060
COPY . /app
WORKDIR /app
RUN yarn && \
	yarn upgrade @trulyacerbic/ttt-gamesdb@latest && \
    yarn cache clean

CMD ["yarn", "start"]
